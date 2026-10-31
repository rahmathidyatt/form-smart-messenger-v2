import { z } from "zod";
import { orderSchema } from "./submission";
// Preserve agent-entered identity verbatim; no punctuation or splitting rules.
export const agentFormSchema=z.object(orderSchema.shape).omit({name:true,code:true}).extend({
 nameCode:z.string().trim().min(1,"Isi nama dan kode agent.").max(180)
}).transform(({nameCode,...rest})=>({...rest,name:nameCode,code:""})).pipe(orderSchema);
export type AgentFormInput=z.input<typeof agentFormSchema>;
