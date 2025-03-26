import { describe, expect, test } from "bun:test";
import Template from '../index'

describe("each tests", () => {
  function dropWhiteSpace(str: string) {
    return str.replace(/\s/g, '')
  }

  test("normal", () => {

    const template = `
      {{each item in list}}
      index is: {{$index}}
      v is: {{item.v}}
      {{/each}}
      
      {{each item in list}}
      index is: {{$index}}
      vv is: {{item.vv}}
      {{/each}}
    `
    const context = { list: [ { v: 'a', vv: 'aa' }, { v: 'b', vv: 'bb' } ] }
    const expected = dropWhiteSpace(`
      index is: 0
      v is: a
      index is: 1
      v is: b
      index is: 0
      vv is: aa
      index is: 1
      vv is: bb
    `)

    expect(
      dropWhiteSpace(
        new Template(template).render(context)
      )
    ).toBe(expected)

  })


  test("nested", () => {

    const template = `
      {{each item in list}}
      group name: {{item.group}}
      {{each value in item.items}}
        - {{value}}
      {{/each}}
      {{/each}}
    `
    const context = {
      list: [
        { group: 'ga', items: [ 'a', 'b' ] },
        { group: 'gb', items: [ 'x', 'y' ] },
      ]
    }
    const expected = dropWhiteSpace(`
      group name: ga
        - a
        - b
      group name: gb
        - x
        - y
    `)

    expect(
      dropWhiteSpace(
        new Template(template).render(context)
      )
    ).toBe(expected)

  })


})
