# Questions & Design Decisions

## 1. ¿La información solo debe ser accesible para usuarios logueados?

Sí. Se trata de información sensible, por lo que el acceso está restringido a usuarios autenticados (tanto `VIEWER` como `ADMIN`).

Al haber agregado una guard global de autenticación, los endpoints públicos deben anotarse manualmente para quedar excluidos.

---

## 2. ¿`taxId` debería ser `@unique`?

Se optó por un constraint de unicidad compuesto sobre `taxId` + `country`, ya que el mismo número de identificación puede pertenecer a entidades de distintos países.

---

## 3. El enunciado menciona un endpoint para calcular riesgo manualmente

Se decidió que el riesgo se calcule automáticamente en cada paso relevante del flujo, en lugar de requerir una llamada explícita. De todas formas, se expone el endpoint mencionado para permitir un recálculo manual si fuera necesario.

---

## 4. El enunciado menciona un endpoint de logout junto con el uso de JWT

Implementar logout con JWT presenta una tensión de diseño: los tokens son stateless por naturaleza, lo que reduce la carga en la base de datos. Invalidarlos requiere algún mecanismo de estado del lado del servidor.

Se adoptó una estrategia de doble token:

- **Access token** de corta duración: se usa para autenticar requests y expira rápidamente.
- **Refresh token** de larga duración: se almacena y puede invalidarse explícitamente al hacer logout.

Esto permite un logout efectivo sin comprometer los beneficios de los JWT para el flujo normal de autenticación.

---

## 5. ¿Por qué SSE en lugar de WebSockets para las notificaciones en tiempo real?

Las notificaciones del sistema son unidireccionales: el servidor informa al cliente sobre cambios de estado, pero el cliente nunca necesita enviar eventos al servidor por ese canal. En ese contexto, WebSockets introducen complejidad innecesaria.

SSE es la herramienta correcta porque:

- La comunicación es exclusivamente servidor -> cliente, que es exactamente el modelo que SSE implementa.
- Funciona sobre HTTP estándar, sin handshake de upgrade ni protocolo adicional.
- El navegador maneja la reconexión automáticamente ante caídas de conexión.
- Es más liviano que WebSockets.