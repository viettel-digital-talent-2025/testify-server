gen-p:
	pnpm dlx prisma generate

migration:
	pnpm dlx prisma db push
	
