import { supabaseServer } from "../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../lib/crm/auth";
import { createClient } from "@supabase/supabase-js";

// GET: Fetch current user's profile
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get sales person data
    const { data: salesPerson, error } = await supabase
      .from("sales_persons")
      .select("*")
      .eq("id", crmUser.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Try to get profile photo from profile_photos table
    let photoUrl = null;
    try {
      const { data: profilePhoto, error: photoError } = await supabase
        .from("profile_photos")
        .select("photo_url")
        .eq("sales_person_id", crmUser.id)
        .single();

      if (!photoError && profilePhoto) {
        photoUrl = profilePhoto.photo_url;
      }
    } catch (err) {
      // Table might not exist, that's okay
      console.log("profile_photos table may not exist");
    }

    return Response.json({ 
      success: true, 
      data: salesPerson,
      photo_url: photoUrl
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update profile (including photo)
export async function PATCH(request) {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get("name");
    const phone = formData.get("phone");
    const photoFile = formData.get("photo");

    const updateData = {};

    // Update full_name if provided (matching the sales_persons table schema)
    if (name) {
      updateData.full_name = name;
    }

    // Update phone if provided
    if (phone) {
      updateData.phone = phone;
    }

    // Handle photo upload
    if (photoFile && photoFile instanceof File) {
      try {
        // Create a unique filename
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${crmUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `profile-photos/${fileName}`;

        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await photoFile.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Use service role client for storage operations
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Try uploading to profile_photos bucket first
        let bucketName = "profile_photos";
        let uploadError = null;
        
        const { error: uploadErr } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            cacheControl: "3600",
            contentType: photoFile.type,
            upsert: true,
          });

        uploadError = uploadErr;

        // If bucket doesn't exist, try alternative bucket name
        if (uploadError) {
          console.log("Trying alternative bucket name...");
          bucketName = "profile-photos";
          const { error: altUploadErr } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(filePath, fileBuffer, {
              cacheControl: "3600",
              contentType: photoFile.type,
              upsert: true,
            });

          if (altUploadErr) {
            console.error("Photo upload error:", altUploadErr);
            return Response.json({ 
              error: "Failed to upload photo. Please ensure a storage bucket named 'profile_photos' or 'profile-photos' exists in Supabase.",
              details: altUploadErr.message 
            }, { status: 500 });
          }
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        
        // Store photo URL separately (will be saved to profile_photos table)
        updateData._photo_url = publicUrl;
      } catch (photoError) {
        console.error("Photo upload error:", photoError);
        return Response.json({ 
          error: "Failed to upload photo",
          details: photoError.message 
        }, { status: 500 });
      }
    }

    // Separate photo URL from other updates
    const photoUrl = updateData._photo_url;
    delete updateData._photo_url;

    // Update sales_persons table (name, phone, etc.) - only fields that exist
    if (Object.keys(updateData).length > 0) {
      const { data, error: updateError } = await supabase
        .from("sales_persons")
        .update(updateData)
        .eq("id", crmUser.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating profile:", updateError);
        return Response.json({ error: updateError.message }, { status: 500 });
      }
    }

    // Handle photo URL - store in profile_photos table and auth metadata
    if (photoUrl) {
      // Update auth user metadata (always works)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({
          data: { avatar_url: photoUrl }
        });
      }

      // Store in profile_photos table
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Upsert to profile_photos table
      const { error: photoTableError } = await supabaseAdmin
        .from("profile_photos")
        .upsert({
          sales_person_id: crmUser.id,
          photo_url: photoUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "sales_person_id"
        });

      if (photoTableError) {
        // If table doesn't exist, log but don't fail
        if (photoTableError.message.includes("does not exist") || photoTableError.message.includes("relation") || photoTableError.code === "42P01") {
          console.log("profile_photos table does not exist. Please create it with columns: sales_person_id (uuid, primary key), photo_url (text), updated_at (timestamp)");
          // Still return success since auth metadata was updated
        } else {
          console.error("Error updating profile_photos table:", photoTableError);
          // Don't fail the request, auth metadata was updated
        }
      }
    }

    // Fetch updated data
    const { data: updatedData } = await supabase
      .from("sales_persons")
      .select("*")
      .eq("id", crmUser.id)
      .single();

    return Response.json({ 
      success: true, 
      data: updatedData,
      photo_url: photoUrl || undefined
    });

    return Response.json({ success: true, message: "No updates provided" });
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

