import { Body, Controller, Post } from "@nestjs/common";
import { PaymentCreateRequest, PaymentResponse } from "@oms/shared";
import { AuthUser, CurrentUser } from "../common/auth";
import { ZodPipe } from "../common/zod.pipe";
import { PaymentsService } from "./payments.service";

@Controller("api/payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  create(
    @Body(new ZodPipe(PaymentCreateRequest)) body: PaymentCreateRequest,
    @CurrentUser() user: AuthUser
  ): Promise<PaymentResponse> {
    return this.payments.create(body, user.id);
  }
}
