import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParsedMenuItem {
  name: string;
  description: string;
  price: number;
  category: string;
}

function detectImageType(base64String: string): string {
  if (base64String.startsWith('/9j/')) return 'image/jpeg';
  if (base64String.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64String.startsWith('R0lGOD')) return 'image/gif';
  if (base64String.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");

    if (!CLAUDE_API_KEY) {
      console.error("CLAUDE_API_KEY not found in environment");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const mediaType = detectImageType(image);
    console.log("Detected media type:", mediaType);

    console.log("Calling Claude API...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: image,
                },
              },
              {
                type: "text",
                text: `Analyze this menu image and extract all menu items. For each item, provide:
1. name: The name of the dish/item
2. description: A brief description if available, otherwise leave empty string
3. price: The numeric price value (convert to decimal, e.g., 12.99)
4. category: The category/section it belongs to (e.g., "Pizza", "Pasta", "Appetizers", "Main Course", "Desserts", "Beverages")

Return the result as a valid JSON array with this exact structure:
[
  {
    "name": "Item Name",
    "description": "Item description",
    "price": 12.99,
    "category": "Category Name"
  }
]

IMPORTANT: 
- Return ONLY the JSON array, no additional text or explanation
- Make sure all prices are numbers, not strings
- Use empty string "" for description if not available`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Failed to process image with AI: ${response.status}` }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();
    console.log("Claude API response:", JSON.stringify(data).substring(0, 200));
    
    const contentBlock = data.content?.[0];

    if (!contentBlock || contentBlock.type !== "text") {
      console.error("Invalid content block:", contentBlock);
      return new Response(
        JSON.stringify({ error: "Invalid response from AI" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let parsedItems: ParsedMenuItem[];
    try {
      const textContent = contentBlock.text.trim();
      console.log("AI response text:", textContent.substring(0, 200));
      
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : textContent;
      parsedItems = JSON.parse(jsonString);
      
      console.log("Successfully parsed", parsedItems.length, "items");
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return new Response(
        JSON.stringify({ error: "Failed to parse menu items" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ items: parsedItems }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
