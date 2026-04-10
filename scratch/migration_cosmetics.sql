-- EJECUTAR EN EL SQL EDITOR DE SUPABASE --

-- 1. Actualizar tabla de perfiles para que otros vean tu estilo
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nick_style text,
ADD COLUMN IF NOT EXISTS avatar_style text,
ADD COLUMN IF NOT EXISTS trainer_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS player_class text;

-- 2. Actualizar tabla de mensajes de chat global
ALTER TABLE public.global_chat_messages 
ADD COLUMN IF NOT EXISTS nick_style text,
ADD COLUMN IF NOT EXISTS avatar_style text;

-- 3. Actualizar la política de inserción del chat para permitir los nuevos campos (Opcional si usas con check simplificado)
-- No suele ser necesario si la política actual es permissive, pero asegura consistencia.

-- 4. Actualizar mensajes antiguos con valores nulos para evitar errores (Opcional)
UPDATE public.global_chat_messages SET nick_style = NULL WHERE nick_style IS NULL;
UPDATE public.global_chat_messages SET avatar_style = NULL WHERE avatar_style IS NULL;
