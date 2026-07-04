# Especificación funcional

## Módulos

### 1. CRM
Tablas:
- Empresas
- Contactos
- Oportunidades
- Contratos
- Correos
- Inteligencia de mercado

### 2. Prospección
Buscar armadores, operadores, flotas atuneras y empresas con buques cerqueros.

Prioridad:
1. Ecuador / Manta / Guayaquil
2. Panamá
3. Colombia
4. México
5. Costa Rica
6. El Salvador
7. Perú

### 3. Campañas comerciales
Generar correos personalizados según:
- País
- Tamaño de flota
- Capacidad del barco
- Tipo de operación
- Idioma
- Nivel de prioridad

### 4. Automatización futura
Usar n8n en VPS Hostinger.
Enviar correos desde: aspinali@heliservix.com
Proveedor: Hostinger Email

SMTP probable:
- smtp.hostinger.com
- Puerto 465 SSL o 587 TLS

### 5. Seguimiento
Secuencia sugerida:
- Día 0: primer correo
- Día 7: seguimiento 1
- Día 15: seguimiento 2
- Día 30: último seguimiento
