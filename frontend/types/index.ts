/**
 * API契約はバックエンドと共有の @oms/shared が唯一の正(single source of truth)。
 * フィールド名のズレはコンパイルエラーとして検出される。
 */
export * from "@oms/shared";
