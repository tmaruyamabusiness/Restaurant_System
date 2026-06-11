import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  MenuCategoryCreateRequest,
  MenuCategoryResponse,
  MenuCategoryUpdateRequest,
  MenuItemCreateRequest,
  MenuItemResponse,
  MenuItemUpdateRequest,
} from "@oms/shared";
import { Roles } from "../common/auth";
import { ZodPipe } from "../common/zod.pipe";
import { toMenuCategory, toMenuItem } from "../common/serializers";
import { PrismaService } from "../prisma.service";

@Controller("api/menu")
export class MenuController {
  constructor(private readonly prisma: PrismaService) {}

  /** 注文画面用は有効なものだけ、管理画面は ?include_inactive=true で全件 */
  @Get("categories")
  async categories(
    @Query("include_inactive") includeInactive?: string
  ): Promise<MenuCategoryResponse[]> {
    const all = includeInactive === "true";
    const categories = await this.prisma.menuCategory.findMany({
      where: all ? undefined : { is_active: true },
      orderBy: { sort_order: "asc" },
      include: {
        items: {
          where: all ? undefined : { is_available: true },
          orderBy: { sort_order: "asc" },
        },
      },
    });
    return categories.map(toMenuCategory);
  }

  @Post("categories")
  @Roles("OWNER", "MANAGER")
  async createCategory(
    @Body(new ZodPipe(MenuCategoryCreateRequest)) body: MenuCategoryCreateRequest
  ): Promise<MenuCategoryResponse> {
    const category = await this.prisma.menuCategory.create({ data: body });
    return toMenuCategory(category);
  }

  @Put("categories/:id")
  @Roles("OWNER", "MANAGER")
  async updateCategory(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(MenuCategoryUpdateRequest)) body: MenuCategoryUpdateRequest
  ): Promise<MenuCategoryResponse> {
    try {
      const category = await this.prisma.menuCategory.update({ where: { id }, data: body });
      return toMenuCategory(category);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw new NotFoundException("カテゴリが見つかりません");
      }
      throw e;
    }
  }

  @Post("items")
  @Roles("OWNER", "MANAGER")
  async createItem(
    @Body(new ZodPipe(MenuItemCreateRequest)) body: MenuItemCreateRequest
  ): Promise<MenuItemResponse> {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id: body.category_id },
    });
    if (!category) throw new ConflictException("カテゴリが存在しません");
    const item = await this.prisma.menuItem.create({ data: body });
    return toMenuItem(item);
  }

  @Put("items/:id")
  @Roles("OWNER", "MANAGER")
  async updateItem(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(MenuItemUpdateRequest)) body: MenuItemUpdateRequest
  ): Promise<MenuItemResponse> {
    try {
      const item = await this.prisma.menuItem.update({ where: { id }, data: body });
      return toMenuItem(item);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw new NotFoundException("商品が見つかりません");
      }
      throw e;
    }
  }
}
