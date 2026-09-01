import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { entityType?: string; entityId?: string; userId?: string; take?: number }) {
    return this.prisma.auditLog.findMany({
      where: { entityType: filters.entityType, entityId: filters.entityId, userId: filters.userId },
      orderBy: { createdAt: 'desc' },
      take: filters.take ?? 100,
    });
  }
}
