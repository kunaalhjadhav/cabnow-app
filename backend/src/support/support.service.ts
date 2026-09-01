import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddSupportMessageDto, CreateSupportTicketDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  create(raisedByUserId: string, dto: CreateSupportTicketDto) {
    return this.prisma.supportTicket.create({ data: { raisedByUserId, ...dto } });
  }

  findMine(raisedByUserId: string) {
    return this.prisma.supportTicket.findMany({ where: { raisedByUserId }, orderBy: { createdAt: 'desc' } });
  }

  findAll(status?: SupportTicketStatus) {
    return this.prisma.supportTicket.findMany({ where: { status }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return ticket;
  }

  async addMessage(ticketId: string, authorUserId: string, dto: AddSupportMessageDto) {
    await this.findOne(ticketId);
    return this.prisma.supportTicketMessage.create({ data: { ticketId, authorUserId, ...dto } });
  }

  async updateStatus(id: string, status: SupportTicketStatus, assignedToUserId?: string) {
    await this.findOne(id);
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status, assignedToUserId, resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : undefined },
    });
  }
}
