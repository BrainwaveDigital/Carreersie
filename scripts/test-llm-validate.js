#!/usr/bin/env node
// Quick test harness to validate LLM JSON output against the schema using ajv
const fs = require('fs')
const path = require('path')
const Ajv = require('ajv')
const addFormats = require('ajv-formats')

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'llm-schema.json'), 'utf8'))
const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)
const validate = ajv.compile(schema)

// Example LLM outputs to test
const examples = [
  {
    name: 'Jane Developer',
    email: 'jane@example.com',
    skills: ['JavaScript', 'Node.js'],
    experiences: [
      { title: 'Software Engineer', company: 'Acme', start_date: '2019-01', end_date: '2022-06', description: 'Worked on X' }
    ]
  },
  {
    name: 'Bad Person',
    email: 'not-an-email',
    skills: 'should-be-array'
  }
]

examples.forEach((ex, idx) => {
  const valid = validate(ex)
  console.log('Example', idx, 'valid?', valid)
  if (!valid) console.log(validate.errors)
})
