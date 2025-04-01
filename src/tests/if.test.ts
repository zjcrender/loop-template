import { describe, expect, test } from "bun:test";
import Template from '../index'

describe("if tests", () => {

	test("renders correctly", () => {

		const template = `{{if foo}}foo{{/if}}`
		const context = { foo: true }
		const expected = `foo`

		expect(new Template(template).render(context)).toBe(expected)

	})

})