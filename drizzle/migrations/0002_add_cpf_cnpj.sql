-- Add cpfCnpj column to users table for Asaas payment integration
ALTER TABLE "users" ADD COLUMN "cpf_cnpj" text;
