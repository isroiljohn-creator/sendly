import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { supabase } from "../config/db";

const router = Router();

// Apply authMiddleware to all routes in this router
router.use(authMiddleware);

/**
 * GET /api/contacts
 * Returns contacts belonging to the authenticated user.
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    const { data: contacts, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ contacts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/contacts/:id
 * Fetches contact details.
 */
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { id } = req.params;

  try {
    const { data: contact, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    return res.json({ contact });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/contacts/:id
 * Updates contact fields (tags, variables).
 */
router.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { id } = req.params;
  const { tags, variables } = req.body;

  try {
    // Verify ownership
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const updates: any = {};
    if (tags !== undefined) updates.tags = tags;
    if (variables !== undefined) updates.variables = variables;

    const { data: updatedContact, error } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ contact: updatedContact });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/contacts/:id
 * Deletes contact.
 */
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { id } = req.params;

  try {
    // Verify ownership
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return res.json({ success: true, message: "Contact deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/contacts/:id/messages
 * Returns message history log for the contact.
 */
router.get("/:id/messages", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { id } = req.params;

  try {
    // Verify contact ownership
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("contact_id", id)
      .order("sent_at", { ascending: true });

    if (error) throw error;
    return res.json({ messages });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
