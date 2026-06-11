import { BadRequestException, PipeTransform } from "@nestjs/common";
import { ZodSchema } from "zod";

export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join(".") || "(body)"}: ${i.message}`)
        .join("; ");
      throw new BadRequestException(`入力値が不正です — ${detail}`);
    }
    return result.data;
  }
}
