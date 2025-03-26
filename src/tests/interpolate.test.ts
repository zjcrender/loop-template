import { describe, expect, test } from "bun:test";
import Template from '../index'

describe("interpolate tests", () => {

  test("renders correctly", () => {

    const template = `{{foo}}: {{bar}}`
    const context = { foo: 'foo', bar: 'bar' }
    const expected = `foo: bar`

    expect(new Template(template).render(context)).toBe(expected)

  })


})
