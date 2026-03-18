import { defineCatalog } from "@json-render/core"
import { schema } from "@json-render/react/schema"
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog"
import { z } from "zod"

export const copilotCatalog = defineCatalog(schema, {
  components: {
    Stack: shadcnComponentDefinitions.Stack,
    Card: shadcnComponentDefinitions.Card,
    Heading: shadcnComponentDefinitions.Heading,
    Text: shadcnComponentDefinitions.Text,
    Badge: shadcnComponentDefinitions.Badge,
    Separator: shadcnComponentDefinitions.Separator,
    Alert: shadcnComponentDefinitions.Alert,
    Accordion: shadcnComponentDefinitions.Accordion,
    Button: shadcnComponentDefinitions.Button,
    Panel: {
      props: z.object({
        title: z.string().nullable(),
        eyebrow: z.string().nullable(),
        testId: z.string().nullable(),
        tone: z.enum(["default", "accent", "muted"]).nullable(),
        size: z.enum(["default", "compact"]).nullable(),
      }),
      slots: ["default"],
      description: "A structured content panel for provider copilot sections.",
    },
    MarkdownAnswer: {
      props: z.object({
        content: z.string(),
        testId: z.string().nullable(),
      }),
      description: "A markdown answer body rendered with Streamdown.",
    },
  },
  actions: {},
})
