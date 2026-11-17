import { createFileRoute } from "@tanstack/react-router";
import { Table } from "@/components/game/table";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Table />;
}
