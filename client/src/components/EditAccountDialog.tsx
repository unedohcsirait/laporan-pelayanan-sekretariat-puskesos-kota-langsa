import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, UserPen } from "lucide-react";

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUsername: string;
}

export function EditAccountDialog({ open, onOpenChange, currentUsername }: EditAccountDialogProps) {
  const { toast } = useToast();

  const [username, setUsername] = useState(currentUsername);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: {
      username?: string;
      currentPassword: string;
      newPassword?: string;
    }) => {
      const res = await fetch("/api/auth/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || "Gagal memperbarui akun");
      }
      return body;
    },
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Akun berhasil diperbarui. Silakan login ulang jika username berubah." });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setUsername(currentUsername);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast({ title: "Validasi", description: "Password saat ini wajib diisi.", variant: "destructive" });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: "Validasi", description: "Konfirmasi password baru tidak cocok.", variant: "destructive" });
      return;
    }

    if (newPassword && newPassword.length < 6) {
      toast({ title: "Validasi", description: "Password baru minimal 6 karakter.", variant: "destructive" });
      return;
    }

    const payload: { username?: string; currentPassword: string; newPassword?: string } = {
      currentPassword,
    };

    if (username.trim() && username.trim() !== currentUsername) {
      payload.username = username.trim();
    }

    if (newPassword) {
      payload.newPassword = newPassword;
    }

    if (!payload.username && !payload.newPassword) {
      toast({ title: "Info", description: "Tidak ada perubahan yang dilakukan.", variant: "destructive" });
      return;
    }

    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <UserPen className="h-5 w-5 text-primary" />
            Edit Akun
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="pt-4 space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-username" className="font-semibold">Username Baru</Label>
            <Input
              id="acc-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Biarkan sama jika tidak ingin mengubah"
              className="h-10 bg-white border-border"
            />
          </div>

          <div className="border-t border-border/60 pt-3 space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-current-pw" className="font-semibold">
                Password Saat Ini <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="acc-current-pw"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password saat ini"
                  className="h-10 bg-white border-border pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-new-pw" className="font-semibold">
                Password Baru <span className="text-muted-foreground font-normal">(Opsional)</span>
              </Label>
              <div className="relative">
                <Input
                  id="acc-new-pw"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="h-10 bg-white border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            {newPassword && (
              <div className="space-y-1.5">
                <Label htmlFor="acc-confirm-pw" className="font-semibold">Konfirmasi Password Baru</Label>
                <div className="relative">
                  <Input
                    id="acc-confirm-pw"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className={`h-10 bg-white border-border pr-10 ${
                      confirmPassword && confirmPassword !== newPassword ? "border-red-400 focus-visible:ring-red-400" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500">Password tidak cocok</p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? "Menyimpan…" : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
