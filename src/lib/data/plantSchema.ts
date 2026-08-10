export const plantJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://palan.app/schemas/plant.json',
  title: 'Plant',
  description: 'A plant record for the Palan plant care app',
  type: 'object',
  required: ['name', 'type', 'careSchedule'],
  properties: {
    id: {
      type: 'string',
      description: 'UUID, auto-generated on import',
    },
    name: {
      type: 'string',
      description: 'Display name for the plant',
    },
    nickname: {
      type: 'string',
      description: 'Casual name',
    },
    species: {
      type: 'string',
      description: 'Scientific or common species name',
    },
    type: {
      type: 'string',
      description: 'Category (Tropical, Succulent, Flowering, etc.)',
    },
    acquiredDate: {
      type: 'string',
      format: 'date',
      description: 'When the plant was acquired (YYYY-MM-DD)',
    },
    location: {
      type: 'string',
      description: 'Where in the home the plant lives',
    },
    images: {
      type: 'array',
      description: 'List of image objects',
      items: {
        type: 'object',
        required: ['type', 'value'],
        properties: {
          type: {
            type: 'string',
            enum: ['url', 'base64'],
            description: 'How the image is stored',
          },
          value: {
            type: 'string',
            description: 'URL or base64 data URI',
          },
          label: {
            type: 'string',
            description: 'Description of the image',
          },
        },
      },
    },
    careSchedule: {
      type: 'object',
      description: 'Care task schedules',
      required: ['watering'],
      properties: {
        watering: {
          type: 'object',
          description: 'Watering schedule',
          required: ['frequencyDays'],
          properties: {
            frequencyDays: {
              type: 'number',
              exclusiveMinimum: 0,
              description: 'How often to water (days)',
            },
            lastDone: {
              type: 'string',
              format: 'date',
              description: 'Last date watered (YYYY-MM-DD)',
            },
            notes: {
              type: 'string',
              description: 'Watering-specific notes',
            },
          },
        },
        fertilizing: {
          type: 'object',
          description: 'Fertilizing schedule',
          required: ['frequencyDays'],
          properties: {
            frequencyDays: {
              type: 'number',
              exclusiveMinimum: 0,
            },
            lastDone: {
              type: 'string',
              format: 'date',
            },
            fertilizerType: {
              type: 'string',
              description: 'Type of fertilizer to use',
            },
            notes: {
              type: 'string',
            },
          },
        },
        repotting: {
          type: 'object',
          description: 'Repotting schedule',
          required: ['frequencyDays'],
          properties: {
            frequencyDays: {
              type: 'number',
              exclusiveMinimum: 0,
            },
            lastDone: {
              type: 'string',
              format: 'date',
            },
            potSize: {
              type: 'string',
              description: 'Current pot size',
            },
            soilType: {
              type: 'string',
              description: 'Soil mix to use',
            },
          },
        },
        pruning: {
          type: 'object',
          description: 'Pruning schedule',
          required: ['frequencyDays'],
          properties: {
            frequencyDays: {
              type: 'number',
              exclusiveMinimum: 0,
            },
            lastDone: {
              type: 'string',
              format: 'date',
            },
            notes: {
              type: 'string',
            },
          },
        },
      },
    },
    environment: {
      type: 'object',
      description: 'Static care requirements',
      properties: {
        light: {
          type: 'string',
          description: 'Light requirements',
        },
        humidity: {
          type: 'string',
          description: 'Humidity preferences',
        },
        temperature: {
          type: 'string',
          description: 'Temperature range',
        },
        pruningStyle: {
          type: 'string',
          description: 'How to prune this plant',
        },
        notes: {
          type: 'string',
          description: 'Additional environment notes',
        },
      },
    },
    pestTracking: {
      type: 'array',
      description: 'Log of pest incidents',
      items: {
        type: 'object',
        required: ['date', 'pest'],
        properties: {
          date: {
            type: 'string',
            format: 'date',
            description: 'When the pest was noticed',
          },
          pest: {
            type: 'string',
            description: 'Type of pest',
          },
          severity: {
            type: 'string',
            enum: ['mild', 'moderate', 'severe'],
            description: 'How bad the infestation is',
          },
          treatment: {
            type: 'string',
            description: 'What was used to treat it',
          },
          resolved: {
            type: 'boolean',
            description: 'Whether the issue is resolved (default false)',
          },
          resolvedDate: {
            type: 'string',
            format: 'date',
            description: 'When resolved',
          },
          notes: {
            type: 'string',
            description: 'Additional notes',
          },
        },
      },
    },
    healthLog: {
      type: 'array',
      description: 'Auto-populated in-app when care actions are logged',
      items: {
        type: 'object',
        required: ['date', 'action'],
        properties: {
          date: {
            type: 'string',
            format: 'date',
            description: 'When the action was performed',
          },
          action: {
            type: 'string',
            enum: ['watering', 'fertilizing', 'repotting', 'pruning'],
            description: 'What was done',
          },
          note: {
            type: 'string',
            description: 'Optional note for this log entry',
          },
        },
      },
    },
    notes: {
      type: 'string',
      description: 'Free-form notes about the plant',
    },
  },
}
