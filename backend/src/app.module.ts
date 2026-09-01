import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { DriversModule } from './drivers/drivers.module';
import { VendorsModule } from './vendors/vendors.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { VehicleCategoriesModule } from './vehicle-categories/vehicle-categories.module';
import { CorporateModule } from './corporate/corporate.module';
import { EmployeesModule } from './employees/employees.module';
import { PackagesModule } from './packages/packages.module';
import { BookingsModule } from './bookings/bookings.module';
import { TripsModule } from './trips/trips.module';
import { RouteChangesModule } from './route-changes/route-changes.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { TrackingModule } from './tracking/tracking.module';
import { MapsModule } from './maps/maps.module';
import { PricingModule } from './pricing/pricing.module';
import { CommissionModule } from './commission/commission.module';
import { PaymentsModule } from './payments/payments.module';
import { InvoicesModule } from './invoices/invoices.module';
import { SettlementsModule } from './settlements/settlements.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RatingsModule } from './ratings/ratings.module';
import { SupportModule } from './support/support.module';
import { AuditModule } from './audit/audit.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }] }),
    ScheduleModule.forRoot(),

    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    DriversModule,
    VendorsModule,
    VehiclesModule,
    VehicleCategoriesModule,
    CorporateModule,
    EmployeesModule,
    PackagesModule,
    BookingsModule,
    TripsModule,
    RouteChangesModule,
    DispatchModule,
    TrackingModule,
    MapsModule,
    PricingModule,
    CommissionModule,
    PaymentsModule,
    InvoicesModule,
    SettlementsModule,
    NotificationsModule,
    RatingsModule,
    SupportModule,
    AuditModule,
  ],
  providers: [
    // Every route requires a valid JWT unless explicitly marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
