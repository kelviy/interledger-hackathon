"use client";

import Link from "next/link";
import { Loader, TriangleAlert } from "lucide-react";
import { SessionProvider } from "@/features/editor/components/SessionContext";
import { useGetProject } from "@/features/projects/api/use-get-project";

import { Editor } from "@/features/editor/components/editor";
import { Button } from "@/components/ui/button";



interface EditorProjectIdPageProps {
  params: {
    projectId: string;
  };
};

const EditorProjectIdPage = ({
  params,
}: EditorProjectIdPageProps) => {
  const { 
    data, 
    isLoading, 
    isError
  } = useGetProject(params.projectId);

  if (isLoading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full flex flex-col gap-y-5 items-center justify-center">
        <TriangleAlert className="size-6 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          Failed to fetch project
        </p>
        <Button asChild variant="secondary">
          <Link href="/">
            Hi help
          </Link>
        </Button>
      </div>
    );
  }

  return (
  <SessionProvider>
    <Editor initialData={data} />
  </SessionProvider>
)
};

export default EditorProjectIdPage;
