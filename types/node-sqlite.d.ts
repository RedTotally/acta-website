declare module "node:sqlite" {
  export type SQLInputValue = string | number | bigint | null | Uint8Array;
  export type SQLOutputValue = string | number | bigint | null | Uint8Array;

  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    all(...params: SQLInputValue[]): Record<string, SQLOutputValue>[];
    get(...params: SQLInputValue[]): Record<string, SQLOutputValue> | undefined;
    run(...params: SQLInputValue[]): StatementResultingChanges;
  }

  export class DatabaseSync {
    constructor(
      path: string,
      options?: { readOnly?: boolean; timeout?: number },
    );
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
