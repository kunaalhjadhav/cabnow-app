import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication, apiPrefix: string) {
  const config = new DocumentBuilder()
    .setTitle('Cab Booking & Corporate Transport Platform API')
    .setDescription(
      'Backend API for the customer app, driver app, corporate portal and admin dashboard. ' +
        'Covers auth, bookings/trips, dispatch, configurable pricing & commission engines, ' +
        'payments, corporate billing and vendor settlements.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addTag('auth')
    .addTag('users')
    .addTag('customers')
    .addTag('drivers')
    .addTag('vendors')
    .addTag('vehicles')
    .addTag('vehicle-categories')
    .addTag('corporate')
    .addTag('employees')
    .addTag('packages')
    .addTag('bookings')
    .addTag('trips')
    .addTag('route-changes')
    .addTag('pricing')
    .addTag('commission')
    .addTag('payments')
    .addTag('invoices')
    .addTag('settlements')
    .addTag('notifications')
    .addTag('ratings')
    .addTag('support')
    .addTag('audit')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
