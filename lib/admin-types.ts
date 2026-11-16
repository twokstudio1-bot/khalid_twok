export type AdminActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const adminInitialState: AdminActionState = { status: "idle" };
