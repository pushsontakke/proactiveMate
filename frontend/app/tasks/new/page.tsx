import type { Metadata } from "next";
import { NewTaskForm } from "@/components/tasks/new-task-form";

export const metadata: Metadata = { title: "New task" };

export default function NewTaskPage() {
  return <NewTaskForm />;
}
