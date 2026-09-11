.PHONY: help test test-e2e docker-build docker-up docker-down k8s-apply k8s-destroy simulate-1 simulate-2 simulate-3 reset

help:
	@echo "LogFlow DevOps Automation Commands"
	@echo "-----------------------------------"
	@echo "make test          : Run all unit tests"
	@echo "make test-e2e      : Run full end-to-end integration test"
	@echo "make docker-build  : Build all Docker container images"
	@echo "make docker-up     : Start all services locally with Docker Compose"
	@echo "make docker-down   : Stop and remove Docker containers"
	@echo "make k8s-apply     : Deploy complete LogFlow stack to Kubernetes"
	@echo "make k8s-destroy   : Delete LogFlow resources from Kubernetes"
	@echo "make simulate-1    : Trigger Scenario 1 (Payments API crash)"
	@echo "make simulate-2    : Trigger Scenario 2 (Web API error storm)"
	@echo "make simulate-3    : Trigger Scenario 3 (Worker degradation)"
	@echo "make reset         : Restore all services to healthy"

test:
	npm --prefix services/payments-api test
	npm --prefix services/web-api test
	npm --prefix services/worker test
	npm --prefix dashboard test

test-e2e:
	node test-e2e.js

docker-build:
	bash docker/build.sh

docker-up:
	bash docker/up.sh

docker-down:
	bash docker/down.sh

k8s-apply:
	bash k8s/deploy.sh

k8s-destroy:
	bash k8s/destroy.sh

simulate-1:
	bash scripts/simulate-failures.sh 1

simulate-2:
	bash scripts/simulate-failures.sh 2

simulate-3:
	bash scripts/simulate-failures.sh 3

reset:
	bash scripts/simulate-failures.sh reset
