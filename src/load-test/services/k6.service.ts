import { ScenarioDto } from '@/scenario/dtos/scenario.dto';
import { Injectable } from '@nestjs/common';
import { ScenarioFlowStepType } from '@prisma/client';
import { ApiConfig, WebConfig } from '../types/config.types';

@Injectable()
export class K6Service {
  constructor() {}

  generateK6Script({
    scenario,
    runHistoryId,
  }: {
    scenario: ScenarioDto;
    runHistoryId: string;
  }): string {
    // Generate flow functions with global tags
    const flowFunctions = scenario.flows
      .map((flow) => {
        const flowName = flow.name.toLowerCase().replace(/\s+/g, '_');
        const steps = flow.steps
          .map((step) => {
            let url;
            let method;
            let headers;
            let body;

            switch (step.type) {
              case ScenarioFlowStepType.BROWSER:
                const webConfig = step.config as unknown as WebConfig;
                url = webConfig.url;
                method = 'get';
                headers = '{}';
                body = 'null';
                break;
              case ScenarioFlowStepType.API:
                const apiConfig = step.config as unknown as ApiConfig;
                url = apiConfig.endpoint;
                method = apiConfig.method.toLowerCase();
                headers = apiConfig.headers
                  ? JSON.stringify(apiConfig.headers)
                  : '{}';
                body = apiConfig.payload
                  ? JSON.stringify(apiConfig.payload)
                  : 'null';
                break;
            }

            const stepName = step.name.toLowerCase().replace(/\s+/g, '_');

            // Create tags object for both request and metrics
            const tags = {
              flow_id: flow.id,
              step_id: step.id,
            };

            return `
              // ${step.name}
              // Set global tags for this step
              const ${stepName}Tags = ${JSON.stringify(tags)};

              exec.vu.tags.flow_id = ${stepName}Tags.flow_id;
              exec.vu.tags.step_id = ${stepName}Tags.step_id;

              const ${stepName}Response = http.${method}(
                '${url}',
                ${body},
                { 
                  headers: ${headers},
                  tags: ${stepName}Tags
                }
              );
              
              check(${stepName}Response, {
                '${step.name} status is 2xx': (r) => r.status >= 200 && r.status < 300,
              });
              
              // Add metrics with flow and step tags
              errorRate.add(${stepName}Response.status >= 400, ${stepName}Tags);

              // Add request duration to metrics
              requestDuration.add(${stepName}Response.timings.duration, ${stepName}Tags);

              delete exec.vu.tags.flow_id;
              delete exec.vu.tags.step_id;

              sleep(1);
            `;
          })
          .join('\n');

        return `
          function ${flowName}() {
            ${steps}
          }
        `;
      })
      .join('\n');

    // Generate flow weights array
    const flowWeights = scenario.flows.map((flow) => flow.weight);
    const totalWeight = flowWeights.reduce((sum, weight) => sum + weight, 0);

    // Generate weighted random selection function
    const weightedRandomSelection = `
      function selectFlow() {
        const random = Math.random() * ${totalWeight};
        let cumulativeWeight = 0;
        
        ${scenario.flows
          .map((flow) => {
            const flowName = flow.name.toLowerCase().replace(/\s+/g, '_');
            return `
            cumulativeWeight += ${flow.weight};
            if (random <= cumulativeWeight) {
              return ${flowName};
            }`;
          })
          .join('\n')}
        
        // Fallback to first flow
        return ${scenario.flows[0].name.toLowerCase().replace(/\s+/g, '_')};
      }
    `;

    const script = `
      import http from 'k6/http';
      import exec from 'k6/execution';
      import { check, sleep } from 'k6';
      import { Rate, Trend } from 'k6/metrics';
      
      const errorRate = new Rate('errors');
      const requestDuration = new Trend('request_duration');
      
      export const options = {
        vus: ${scenario.vus},
        duration: '${scenario.duration}s',
        tags: {
          run_history_id: "${runHistoryId}",
          scenario_id: "${scenario.id}",
          flow_id: "",
          step_id: "",
        },
        thresholds: {
          'errors': ['rate<0.1'],
          'request_duration': ['p(95)<500'],
        }
      };
  
      ${flowFunctions}
      
      ${weightedRandomSelection}
      
      export default function() {
        const selectedFlow = selectFlow();
        selectedFlow();
      }
    `;

    return script;
  }
}
