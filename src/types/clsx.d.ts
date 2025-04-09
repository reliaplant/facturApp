declare module 'clsx' {
  export type ClassValue = 
    | string
    | number
    | boolean
    | null
    | undefined
    | Record<string, unknown>
    | ClassValue[];
    
  export default function clsx(...inputs: ClassValue[]): string;
}
