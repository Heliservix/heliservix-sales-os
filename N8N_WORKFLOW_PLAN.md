# Plan de automatización n8n

## Workflow 1: Prospección
Frecuencia: lunes, miércoles y viernes 9:00 AM Panamá.

Salida:
- Nuevas empresas
- Contactos públicos
- Prioridad comercial
- Borradores de correo

## Workflow 2: Envío con aprobación
Pasos:
1. Generar borrador
2. Enviar a Adolfo para aprobación
3. Si aprueba, enviar vía SMTP Hostinger
4. Registrar en CRM

## Workflow 3: Seguimiento
Condición:
- Si no hay respuesta en 7/15/30 días, generar seguimiento.
- Si hay respuesta, cambiar estado a "Respondió" o "Negociación".

## Credenciales necesarias
No guardar contraseñas en archivos.

Configurar SMTP en n8n:
- Host: smtp.hostinger.com
- Usuario: aspinali@heliservix.com
- Puerto: 465 SSL o 587 TLS
