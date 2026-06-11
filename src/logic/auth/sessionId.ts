// fallow-ignore-file security-sink
export const SESSION_ID = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)

