declare module "csv-parse" {
    import { EventEmitter } from "events";
    
    export interface Options {
        columns?: boolean | string[] | ((record: any[]) => string[]);
        skip_empty_lines?: boolean;
        trim?: boolean;
        [key: string]: any;
    }
    
    export interface ParseStream extends EventEmitter {
        on(event: "data", listener: (data: any) => void): this;
        on(event: "end", listener: () => void): this;
        on(event: "error", listener: (error: Error) => void): this;
    }
    
    export function parse(input: string | Buffer, options?: Options): ParseStream;
}
