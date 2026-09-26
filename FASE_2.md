# DinoCupones — Fase 2 cerrada

Versión finalizada el 26-09-2026.

## Arquitectura de la experiencia

La aplicación mantiene la identidad y el contenido aprobado en la Fase 1, pero separa las acciones principales en cinco espacios:

- **Cupones:** recibidos, enviados y estados.
- **Chat:** DinoMensajes privados del DinoDúo.
- **Regalar:** creación de DinoCupones para la persona vinculada.
- **Mural:** recuerdos privados del DinoDúo.
- **Nosotros:** vinculación, estado y administración del DinoDúo.

## DinoDúo

- Creación y aceptación de códigos privados.
- Detección del vínculo en tiempo real.
- Confirmación visual de conexión.
- Accesos rápidos a Chat y Regalar.
- Desvinculación con confirmación propia.
- Los datos históricos no se mezclan con un vínculo futuro.

## DinoChat

- Conversación en tiempo real mediante listeners de Firestore.
- Badge de mensajes no leídos.
- Agrupación por Hoy, Ayer y fecha.
- Hora por mensaje.
- Estado enviado y leído.
- Respuesta a un mensaje específico y navegación a la cita original.
- Mensajes rápidos.
- Título opcional.
- Contador de caracteres.
- Campo de escritura autoajustable.
- Notificación cuando llega un mensaje nuevo.
- Limpieza de listeners al cerrar sesión o cambiar de vínculo.
- Estado de carga separado del estado “sin DinoDúo”, evitando mostrar “Conectar DinoDúo” cuando el vínculo ya está activo.

## Regalar

- Pantalla separada para crear DinoCupones.
- Destinatario tomado directamente del DinoDúo.
- Nombre, actividad y vencimiento.
- Historial de cupones enviados.
- Sin mezclar el formulario con la administración del vínculo.

## Estabilidad

- Regla global de elementos ocultos para impedir que estilos de componentes vuelvan visibles controles con `hidden`.
- Caché PWA versionada.
- Contrato UI actualizado.
- Mantiene Firebase, Firestore, OneSignal, Cloudinary, DinoMural, intro, iconos y diseño premium de la Fase 1.
