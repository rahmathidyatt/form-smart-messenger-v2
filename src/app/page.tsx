import { SimpleForm } from "@/components/simple-form";
import { configured } from "@/lib/server/bridge";
export const dynamic="force-dynamic";
export default function Home(){return <SimpleForm ready={configured()}/>}
