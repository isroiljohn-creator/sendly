import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { supabase } from "../config/db";

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/tags
 * Lists operator tags for the user.
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    const { data: tags, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (error) throw error;
    return res.json({ tags });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tags
 * Creates a new operator tag.
 */
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { name, color } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Tag name is required" });
  }

  try {
    const { data: tag, error } = await supabase
      .from("tags")
      .insert({
        user_id: userId,
        name,
        color,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique constraint violation
        return res.status(409).json({ error: "Tag with this name already exists" });
      }
      throw error;
    }

    return res.status(201).json({ tag });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/tags/:id
 * Updates an operator tag's name or color.
 */
router.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { id } = req.params;
  const { name, color } = req.body;

  try {
    // Verify ownership
    const { data: existingTag } = await supabase
      .from("tags")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingTag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;

    const { data: tag, error } = await supabase
      .from("tags")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ tag });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/tags/:id
 * Deletes an operator tag.
 */
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { id } = req.params;

  try {
    // Verify ownership
    const { data: existingTag } = await supabase
      .from("tags")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingTag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return res.json({ success: true, message: "Tag deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
