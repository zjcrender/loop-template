type ContentBLock = {
  type: "content",
  content: string
}

type EachBlock = {
  type: "each",
  expr: {
    itemName: string,
    dataFrom: string
  }
  content: string
}

type IfBlock = {
  type: "if",
  expr: {
    condition: string
  }
  content: string
}

type Block = ContentBLock | EachBlock | IfBlock

type Context = Record<string, any>

export default class Template {
  private blocks: Block[] = []

  private static readonly DIRECTIVES = {
    EACH: {
      START: /{{\s*each\s+([a-zA-Z0-9_]+)\s+in\s+([a-zA-Z0-9_.$]+)\s*}}/,
      END: "{{/each}}"
    },
    IF: {
      START: /{{\s*if\s+([a-zA-Z0-9_.$]+)\s*}}/,
      END: "{{/if}}"
    }
  }

  constructor(private template: string) {
  }

  // 将内容分割成：普通内容块 和 each指令块
  private blockProcessed = false

  private findMatchingEndTag(content: string, startIndex: number, startTag: RegExp, endTag: string): number {
    let depth = 1;
    let currentIndex = startIndex;

    const startRe = new RegExp(startTag, 'g');
    startRe.lastIndex = currentIndex;

    while (depth > 0) {
      const nextStart = startRe.exec(content);
      const nextEnd = content.indexOf(endTag, currentIndex);

      if (nextEnd === -1) {
        throw new Error("Unmatched directive");
      }

      if (nextStart && nextStart.index < nextEnd) {
        depth++;
        currentIndex = nextStart.index + nextStart[0].length;
      } else {
        depth--;
        currentIndex = nextEnd + endTag.length;
      }

      startRe.lastIndex = currentIndex;
    }

    return currentIndex - endTag.length;
  }

  private parseEachBlock(content: string, startMatch: RegExpMatchArray): [Block | null, number] {
    const startIndex = (startMatch.index ?? 0) + startMatch[0].length;
    const endIndex = this.findMatchingEndTag(
      content,
      startIndex,
      Template.DIRECTIVES.EACH.START,
      Template.DIRECTIVES.EACH.END
    );

    const block: EachBlock = {
      type: 'each',
      expr: {
        itemName: startMatch[1]!,
        dataFrom: startMatch[2]!,
      },
      content: content.slice(startIndex, endIndex)
    };

    return [block, endIndex + Template.DIRECTIVES.EACH.END.length];
  }
  private parseIfBlock(content: string, startMatch: RegExpMatchArray): [Block | null, number] {
    const startIndex = (startMatch.index ?? 0) + startMatch[0].length;
    const endIndex = this.findMatchingEndTag(
      content,
      startIndex,
      Template.DIRECTIVES.IF.START,
      Template.DIRECTIVES.IF.END
    );

    const block: IfBlock = {
      type: 'if',
      expr: {
        condition: startMatch[1]!
      },
      content: content.slice(startIndex, endIndex).trim()
    };
    return [block, endIndex + Template.DIRECTIVES.IF.END.length];
  }
  private parseNextBlock(content: string, startIndex: number = 0): [Block | null, number] {
    if (startIndex >= content.length) {
      return [null, startIndex];
    }

    // Try to match each directive type
    const eachRe = new RegExp(Template.DIRECTIVES.EACH.START, 'g');
    const ifRe = new RegExp(Template.DIRECTIVES.IF.START, 'g');

    eachRe.lastIndex = startIndex;
    ifRe.lastIndex = startIndex;

    const eachMatch = eachRe.exec(content);
    const ifMatch = ifRe.exec(content);

    // Find the earliest match
    const matches = [
      eachMatch && { type: 'each', match: eachMatch, index: eachMatch.index },
      ifMatch && { type: 'if', match: ifMatch, index: ifMatch.index }
    ].filter(Boolean);

    // If no directives found, return remaining content as content block
    if (matches.length === 0) {
      return [{
        type: 'content',
        content: content.slice(startIndex)
      }, content.length];
    }

    // Sort matches by index to find the earliest
    const earliest = matches.sort((a, b) => a!.index - b!.index)[0]!;

    // If there's content before the directive, return it as a content block
    if (earliest.index > startIndex) {
      return [{
        type: 'content',
        content: content.slice(startIndex, earliest.index)
      }, earliest.index];
    }

    // Parse the appropriate block type
    switch (earliest.type) {
      case 'each':
        return this.parseEachBlock(content, earliest.match);
      case 'if':
        return this.parseIfBlock(content, earliest.match);
      default:
        throw new Error(`Unknown directive type: ${earliest.type}`);
    }
  }

  private intoBlocks() {
    if (this.blockProcessed) return;

    const blocks: Block[] = [];
    let currentPos = 0;

    while (currentPos < this.template.length) {
      const [block, nextPos] = this.parseNextBlock(this.template, currentPos);
      if (!block) break;

      blocks.push(block);
      currentPos = nextPos;
    }

    this.blocks = blocks;
    this.blockProcessed = true;
  }
  private getContextValue(path: string, context: Context): any {
    const keys = path.split('.')
    let value = ""
    try {
      value = keys.reduce((value, key) => value[key], context as any)
    } catch {
      value = ""
    }
    return value
  }

  private renderInterpolate(content: string, context: Context): string {
    return content.replace(/{{\s*([a-zA-Z0-9_.$]+)\s*}}/g, (_, expr) => this.getContextValue(expr, context));
  }

  private renderContents(block: ContentBLock, context: Context): string {
    return this.renderInterpolate(block.content, context)
  }

  private renderEach(block: EachBlock, context: Context): string {
    const { itemName, dataFrom } = block.expr
    const array = this.getContextValue(dataFrom, context)
    if (!Array.isArray(array)) return ""

    return array
      .map((element, index) => {
        const loopContext = Object.create(context, {
          $index: { value: index },
          [itemName]: { value: element }
        })

        return new Template(index === 0
          ? block.content.trim()
          : block.content.trimEnd()
        ).render(loopContext)
      })
      .join('');
  }

  private renderIf(block: IfBlock, context: Context): string {
    const { condition } = block.expr
    const value = this.getContextValue(condition, context)
    if (value) {
      return new Template(block.content).render(context)
    }
    return ''
  }

  render(context: Context): string {
    this.intoBlocks()
    return this
      .blocks
      .map(block => {
        switch (block.type) {
          case "content":
            return this.renderContents(block, context)

          case "each":
            return this.renderEach(block, context)

          case "if":
            return this.renderIf(block, context)
        }
      })
      .join("")
  }
}
