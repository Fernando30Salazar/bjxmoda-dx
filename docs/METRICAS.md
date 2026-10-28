# Métricas del experimento

Todas las consultas se ejecutan en el **SQL Editor** de Supabase (rol con acceso total). Las vistas
no son accesibles con la clave pública y no incluyen nombres.

## Datos agregados vs. registros personales

| Tipo | Dónde | Contiene datos personales |
|---|---|---|
| Sesiones del test (inicio/fin) | `test_sessions` | No |
| Cuestionario de percepción | `brand_perception_responses` (por sesión) | No |
| Participaciones | `fashion_participants` | Sí: nombre público |
| Analítica | vistas `analytics_*` | No (solo conteos y promedios) |

## Consultas

```sql
-- Resumen: tests iniciados y completados, tasa de finalización,
-- % que consiente la galería, mediana del tiempo de finalización (segundos)
select * from analytics_overview;

-- Distribución de los cuatro arquetipos (incluye cuántos fueron por empate)
select * from analytics_archetypes;

-- Actividad por día (hora de Ciudad de México)
select * from analytics_daily;

-- Percepción de pertenencia y valor de marca (Likert 1–5)
select * from analytics_perception;
select * from analytics_perception_by_archetype;

-- ¿Consentir la galería se asocia con mayor pertenencia?
select p.public_consent,
       count(*) as n,
       round(avg(r.belonging), 2)   as pertenencia,
       round(avg(r.brand_value), 2) as valor_marca
from brand_perception_responses r
join fashion_participants p on p.session_id = r.session_id
group by p.public_consent;

-- Distribución por pregunta (solo si STORE_ANSWERS=true)
select * from analytics_answers;

-- Filtrar a la ventana de la actividad
select archetype, count(*)
from fashion_participants
where created_at between '2026-11-05 09:00-06' and '2026-11-05 14:00-06'
group by archetype;
```

## Notas metodológicas

- **Tasa de finalización** = sesiones completadas / sesiones iniciadas. Una sesión se inicia al
  pasar el formulario y se completa al guardar el resultado. Recargar la página o abandonar cuenta
  como no finalizado.
- **Tiempo de finalización** = `completed_at − started_at`, medido con el reloj del servidor. La
  vista descarta valores menores a 5 s o mayores a 1 h. Incluye el tiempo en el formulario si la
  persona vuelve atrás.
- Solo se vincula una participación por sesión: repetir el test crea una sesión nueva.
- Los ítems Likert son: `identity_match` (el resultado me refleja), `personalization` (se sintió
  hecho para mí), `belonging` (pertenencia a la comunidad BJXMODA), `brand_value` (valoro más la
  marca). Ajusta la redacción en `src/components/PerceptionSurvey.jsx` si tu instrumento lo
  requiere; si cambias el número de ítems, actualiza también la tabla y la función SQL.
- Los arquetipos son perfiles creativos basados en preferencias declaradas. No permiten conclusiones
  sobre respuestas cerebrales ni rasgos psicológicos.

## Exportar

**Table Editor → (vista o tabla) → Export → CSV**, o desde SQL Editor con el botón de descarga del
resultado. Para compartir con el equipo, exporta solo vistas `analytics_*`.
