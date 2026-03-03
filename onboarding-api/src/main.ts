import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { logger } from './logging/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  logger.log('Starting application bootstrap...');

  app.useGlobalPipes(new ValidationPipe(
    {
      whitelist: true,
      forbidNonWhitelisted: true
    }
  ));

  app.useGlobalGuards(app.get(JwtAuthGuard));

  // Configuración Swagger
  const config = new DocumentBuilder()
    .setTitle('Onboarding API')
    .setDescription('API para gestión de onboarding de empresas y riesgo')
    .setVersion('1.0')
      .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    'access-token',
  )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
}
bootstrap();
