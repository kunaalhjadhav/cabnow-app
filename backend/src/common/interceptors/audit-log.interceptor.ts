import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Writes an audit-log row for any mutating request (POST/PATCH/PUT/DELETE)
 * handled by a controller annotated with @Audit('ENTITY_TYPE'). @Audit is
 * typically applied at the controller (class) level, so this checks the
 * method first and falls back to the class — matching how @Roles/@Public
 * metadata is resolved elsewhere in the app.
 * This keeps a full trail as required by spec §12 (audit logging) without
 * hand-writing a log call in every service method.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const isMutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

    if (!isMutating) return next.handle();

    const entityType =
      this.reflector.getAllAndOverride<string>('audit:entity', [context.getHandler(), context.getClass()]) ??
      request.baseUrl;
    const userId = request.user?.userId;

    return next.handle().pipe(
      tap((result) => {
        this.prisma.auditLog
          .create({
            data: {
              userId: userId ?? null,
              action: `${method} ${request.route?.path ?? request.url}`,
              entityType: String(entityType),
              entityId: result?.id ?? null,
              after: result ? JSON.parse(JSON.stringify(result)) : undefined,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
            },
          })
          .catch(() => {
            /* audit logging must never break the primary request */
          });
      }),
    );
  }
}
