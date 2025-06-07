g-p:
	pnpm dlx prisma generate

migration:
	pnpm dlx prisma db push
	
image:
	docker build -t npkhang287/testify-app:latest .
	docker push npkhang287/testify-app:latest

port-forward:
	kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 31133:80

app:
	kubectl delete -f ./k8s/base/testify-app/
	kubectl apply -f ./k8s/base/testify-app/
