import { Sandbox } from "@e2b/code-interpreter";
import { createAgent, createNetwork, createTool, openai } from "@inngest/agent-kit";
import { inngest } from "./client";
import { getAIClient, getSandbox, lastAssistantTextMessageContent } from "./utils";
import { z } from "zod";
import { PROMPT } from "@/prompt";
import OpenAI from "openai";
import prisma from "@/lib/prisma";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get sandbox id", async () => {
      const sandbox = await Sandbox.create("vibeai-nextjs-test-01");
      return sandbox.sandboxId;
    });
    const system_prompt = PROMPT;
    const user_prompt = `Write following code snippet: ${event.data.value}`;
    const ai = getAIClient();

    const model = process.env.DEEPSEEK_API_KEY ? "deepseek-reasoner" : "gpt-4o";
    if (!model.includes("deepseek")) {
      const codingAgent = createAgent({
        name: "terminal",
        description: "Use the terminal to run commands",
        model: openai({ model: "gpt-4o" }),
        system: PROMPT,
        tools: [
          createTool({
            name: "terminal",
            description: "Use the terminal to run commands",
            parameters: z.object({
              command: z.string(),
            }),
            handler: async ({ command }, { step }) => {
              return await step?.run("terminal", async () => {
                const buffers = { stdout: "", stderr: "" };

                try {
                  // Basic allowlist to reduce risk
                  const ALLOW = [/^npm\s+(?:install|i)\b/i, /^ls\b/i, /^cat\b/i, /^echo\b/i];
                  if (!ALLOW.some((rx) => rx.test(command.trim()))) {
                    return `Blocked command by policy: ${command}`;
                  }
                  const sandbox = await getSandbox(sandboxId);
                  const result = await sandbox.commands.run(command, {
                    onStdout: (data: string) => {
                      buffers.stdout += data;
                    },
                    onStderr: (data: string) => {
                      buffers.stderr += data;
                    },
                  });
                  return result.stdout;
                } catch (error) {
                  console.error(`Command failed: ${error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`);
                  return `Command failed: ${error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
                }
              });
            },
          }),
          createTool({
            name: "createOrUpdateFiles",
            description: "Create or update files in the sandbox",
            parameters: z.object({
              files: z.array(
                z.object({
                  path: z.string(),
                  content: z.string(),
                })
              ),
            }),
            handler: async ({ files }, { step, network }) => {
              const newFiles = await step?.run("createOrUpdateFiles", async () => {
                try {
                  const updatedFiles = network.state.data.files || {};
                  const sandbox = await getSandbox(sandboxId);
                  for (const file of files) {
                    await sandbox.files.write(file.path, file.content);
                    updatedFiles[file.path] = file.content;
                  }
                  return updatedFiles;
                } catch (error) {
                  return `Error: ${error}`;
                }
              });
              if (typeof newFiles === "object") {
                network.state.data.files = newFiles;
              }
            },
          }),
          createTool({
            name: "readFiles",
            description: "Read files from the sandbox",
            parameters: z.object({
              files: z.array(z.string()),
            }),
            handler: async ({ files }, { step }) => {
              return await step?.run("readFiles", async () => {
                try {
                  const sandbox = await getSandbox(sandboxId);
                  const contents = [];
                  for (const file of files) {
                    // Validate paths (allow both relative and /home/user/* since PROMPT mentions both)
                    if (file.includes("..") || (!file.startsWith("/home/user") && file.startsWith("/"))) {
                      throw new Error(`Invalid path: ${file}`);
                    }
                    const content = await sandbox.files.read(file);
                    contents.push({ path: file, content });
                  }
                  return JSON.stringify(contents);
                } catch (error) {
                  return `Error: ${error}`;
                }
              });
            },
          }),
        ],
        lifecycle: {
          onResponse: async ({ result, network }) => {
            const lastAssistantMessageText = lastAssistantTextMessageContent(result);
            if (lastAssistantMessageText && network) {
              if (lastAssistantMessageText.includes("<task_summary>")) {
                network.state.data.summary = lastAssistantMessageText;
              }
            }
            return result;
          },
        },
      });

      const network = createNetwork({
        name: "coding-agent-network",
        agents: [codingAgent],
        maxIter: 15,
        router: async ({ network }) => {
          const summary = network.state.data.summary;

          if (summary) {
            return;
          }

          return codingAgent;
        },
      });

      const networkResult = await network.run(event.data.value);
      // 获取沙盒 URL
      const sandboxUrl = await step.run("get-sandbox-url", async () => {
        const sandbox = await getSandbox(sandboxId);
        const host = sandbox.getHost(3000);
        return `https://${host}`;
      });
      await step.run("save-result", async () => {
        return await prisma.message.create({
          data: {
            content: networkResult.state.data.summary,
            role: "ASSISTANT",
            type: "RESULT",
            Fragment: {
              create: {
                sandboxUrl: sandboxUrl,
                files: networkResult.state.data.files,
                title: "Fragment",
              },
            },
          },
        });
      });
      // 返回结果
      return {
        title: "Fragment",
        url: sandboxUrl,
        files: networkResult.state.data.files,
        summary: networkResult.state.data.summary,
      };
    } else {
      // 正确定义工具类型
      const tools: OpenAI.ChatCompletionTool[] = [
        {
          type: "function",
          function: {
            name: "terminal",
            description: "Use the terminal to run commands",
            parameters: {
              type: "object",
              properties: {
                command: { type: "string" },
              },
              required: ["command"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "createOrUpdateFiles",
            description: "Create or update files in the sandbox",
            parameters: {
              type: "object",
              properties: {
                files: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      path: { type: "string" },
                      content: { type: "string" },
                    },
                    required: ["path", "content"],
                  },
                },
              },
              required: ["files"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "readFiles",
            description: "Read files from the sandbox",
            parameters: {
              type: "object",
              properties: {
                files: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["files"],
            },
          },
        },
      ];

      // 状态管理
      const state = {
        files: {} as Record<string, string>,
        summary: "" as string,
      };

      // 工具处理函数
      const handleToolCall = async (toolCall: OpenAI.ChatCompletionMessageToolCall) => {
        if (toolCall.type === "function") {
          const functionCall = toolCall.function;
          const name = functionCall.name;

          let args: any;
          try {
            args = JSON.parse(functionCall.arguments);
          } catch (error) {
            return `Error parsing arguments for ${name}: ${error}. Arguments: ${functionCall.arguments}`;
          }

          return await handleFunctionCall(name, args);
        } else {
          const customCall = toolCall.custom;
          return `Custom tool call not supported: ${customCall.name}`;
        }
      };

      // 处理具体的函数调用
      const handleFunctionCall = async (name: string, args: any) => {
        switch (name) {
          case "terminal":
            return await step.run("terminal", async () => {
              const buffers = { stdout: "", stderr: "" };
              try {
                // Basic allowlist to reduce risk (same as non-deepseek branch)
                const ALLOW = [/^npm\s+(?:install|i)\b/i, /^ls\b/i, /^cat\b/i, /^echo\b/i];
                if (!ALLOW.some((rx) => rx.test(args.command.trim()))) {
                  return `Blocked command by policy: ${args.command}`;
                }
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(args.command, {
                  onStdout: (data: string) => {
                    buffers.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffers.stderr += data;
                  },
                });
                return result.stdout;
              } catch (error) {
                console.error(`Command failed: ${error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`);
                return `Command failed: ${error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
              }
            });

          case "createOrUpdateFiles":
            return await step.run("createOrUpdateFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                for (const file of args.files) {
                  await sandbox.files.write(file.path, file.content);
                  state.files[file.path] = file.content;
                }
                return `Successfully created/updated ${args.files.length} files: ${args.files
                  .map((f: any) => f.path)
                  .join(", ")}`;
              } catch (error) {
                return `Error: ${error}`;
              }
            });

          case "readFiles":
            return await step.run("readFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents: Array<{ path: string; content: string }> = [];
                for (const file of args.files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }
                return JSON.stringify(contents);
              } catch (error) {
                return `Error: ${error}`;
              }
            });

          default:
            return `Unknown function: ${name}`;
        }
      };

      // 辅助函数：提取消息内容为字符串 - 更新类型定义
      const getMessageContent = (
        content:
          | string
          | Array<OpenAI.ChatCompletionContentPartText | OpenAI.ChatCompletionContentPartRefusal>
          | null
          | undefined
      ): string => {
        if (!content) return "";
        if (typeof content === "string") return content;
        if (Array.isArray(content)) {
          return content
            .filter((part): part is OpenAI.ChatCompletionContentPartText => part.type === "text")
            .map((part) => part.text)
            .join("\n");
        }
        return "";
      };

      // 辅助函数：检查内容是否包含任务总结 - 更新类型定义
      const contentContainsSummary = (
        content:
          | string
          | Array<OpenAI.ChatCompletionContentPartText | OpenAI.ChatCompletionContentPartRefusal>
          | null
          | undefined
      ): boolean => {
        const contentString = getMessageContent(content);
        return contentString.includes("<task_summary>");
      };

      // 消息类型定义
      let messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: system_prompt },
        { role: "user", content: user_prompt },
      ];

      let finalResult = "";
      let iteration = 0;
      const maxIterations = 15;

      // 主循环
      while (iteration < maxIterations) {
        const completion = (await step.ai.wrap(
          `code-agent-iteration-${iteration}`,
          ai.chat.completions.create.bind(ai.chat.completions),
          {
            messages,
            model,
            temperature: model.includes("deepseek") ? 0.0 : 1,
            tools,
            tool_choice: "auto",
          }
        )) as OpenAI.ChatCompletion;

        const message = completion.choices[0]?.message;

        if (!message) {
          finalResult = "No response from AI";
          break;
        }

        // 添加到消息历史
        messages.push(message);

        // 如果没有工具调用，就结束
        if (!message.tool_calls || message.tool_calls.length === 0) {
          finalResult = getMessageContent(message.content);

          // 检查是否有任务总结
          if (contentContainsSummary(message.content)) {
            state.summary = finalResult;
          }
          break;
        }

        // 处理所有工具调用
        const toolResults: OpenAI.ChatCompletionToolMessageParam[] = [];
        for (const toolCall of message.tool_calls) {
          const result = await handleToolCall(toolCall);
          // 确保 content 是字符串类型
          const resultContent = String(result);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: resultContent,
          });
        }

        // 将工具结果添加到消息中
        messages.push(...toolResults);
        iteration++;

        // 检查是否应该提前结束 - 使用辅助函数处理所有内容类型
        const lastToolResult = toolResults[toolResults.length - 1];
        const lastToolContent = getMessageContent(lastToolResult.content);
        if (lastToolContent && lastToolContent.includes("<task_summary>")) {
          state.summary = lastToolContent;
          finalResult = lastToolContent;
          break;
        }

        // 检查最后一条助手消息是否有总结
        const lastAssistantMessage = messages
          .filter((m): m is OpenAI.ChatCompletionAssistantMessageParam => m.role === "assistant")
          .pop();

        if (lastAssistantMessage && contentContainsSummary(lastAssistantMessage.content)) {
          const summaryContent = getMessageContent(lastAssistantMessage.content);
          state.summary = summaryContent;
          finalResult = summaryContent;
          break;
        }

        // 如果达到最大迭代次数，设置最终结果
        if (iteration >= maxIterations) {
          finalResult = "Reached maximum iterations";
          break;
        }
      }

      // 获取沙盒 URL
      const sandboxUrl = await step.run("get-sandbox-url", async () => {
        const sandbox = await getSandbox(sandboxId);
        const host = sandbox.getHost(3000);
        return `https://${host}`;
      });

      await step.run("save-result", async () => {
        return await prisma.message.create({
          data: {
            content: state.summary,
            role: "ASSISTANT",
            type: "RESULT",
            Fragment: {
              create: {
                sandboxUrl: sandboxUrl,
                files: state.files,
                title: "Fragment",
              },
            },
          },
        });
      });

      // 返回结果
      return {
        title: "Fragment",
        url: sandboxUrl,
        files: state.files,
        summary: state.summary || finalResult,
        iterations: iteration,
      };
    }
  }
);
