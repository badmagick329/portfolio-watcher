type AppErrorCodes = "FILE_IO" | "API" | "NETWORK";
type AppError = { code: AppErrorCodes; message: string };

export type { AppError };
