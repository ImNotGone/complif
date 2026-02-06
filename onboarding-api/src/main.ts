import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Activamos validación global
  app.useGlobalPipes(new ValidationPipe());

  // Configuración Swagger
  const config = new DocumentBuilder()
    .setTitle('Onboarding API')
    .setDescription('API para gestión de onboarding de empresas y riesgo')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
