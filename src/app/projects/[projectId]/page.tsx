import React from "react";

interface ProjectIdPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

const ProjectIdPage = async ({ params }: ProjectIdPageProps) => {
  const { projectId } = await params;
  return <div>Project ID Page: {projectId}</div>;
};

export default ProjectIdPage;
