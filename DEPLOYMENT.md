# Deployment Checklist

## Railway (Backend)
Set these environment variables in Railway:

- APP_PORT=8080
- DATABASE_URL=postgresql://postgres.vbwfesraeptqlifxekms:[YOUR-PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
- STORAGE_PROVIDER=supabase
- SUPABASE_URL=https://vbwfesraeptqlifxekms.supabase.co
- SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid2Zlc3JhZXB0cWxpZnhla21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTI0MzgsImV4cCI6MjEwMDA2ODQzOH0.auJm2DCiTigLA9xJ1wu6mM1Bx9I_Pww81Pig18YHuDk
- SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_BUCKET=image
- POSTGRES_SSLMODE=require

## Vercel (Frontend)
Set these environment variables in Vercel:

- VITE_API_BASE_URL=https://YOUR_RAILWAY_BACKEND_URL

## Supabase
Make sure:

1. The database schema has been applied.
2. A storage bucket named image exists and is public.
3. The service role key is valid.
