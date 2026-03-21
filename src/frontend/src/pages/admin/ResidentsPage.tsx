import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Principal } from "@icp-sdk/core/principal";
import { Link, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { FlatOwnerPublic as FlatOwner } from "../../backend.d";
import { useAdminActor } from "../../contexts/AdminActorContext";
import { formatINR } from "../../utils/format";

type ModalType = "add" | "edit" | "delete" | "link" | null;

const EMPTY_FORM = {
  blockNo: "",
  flatNo: "",
  ownerName: "",
  phone: "",
  maintenanceAmount: "",
  username: "",
  password: "",
};

type FormState = typeof EMPTY_FORM;

function SocietyOverviewMini() {
  const { actor, isFetching } = useAdminActor();
  const [data, setData] = useState<{
    totalFlats: bigint;
    totalPendingDues: bigint;
    totalCollected: bigint;
  } | null>(null);

  useEffect(() => {
    if (!actor || isFetching) return;
    actor
      .getSocietyOverview()
      .then(setData)
      .catch(() => null);
  }, [actor, isFetching]);

  if (!data) return null;

  const tiles = [
    {
      label: "Total Flats",
      value: data.totalFlats.toString(),
      bg: "bg-[oklch(0.94_0.04_252)]",
    },
    {
      label: "Total Pending",
      value: formatINR(data.totalPendingDues),
      bg: "bg-[oklch(0.96_0.03_25)]",
    },
    {
      label: "Total Collected",
      value: formatINR(data.totalCollected),
      bg: "bg-[oklch(0.95_0.04_200)]",
    },
  ];

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4">
      <p className="text-xs font-semibold text-muted-foreground mb-3">
        Society Overview ({data.totalFlats.toString()})
      </p>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`${t.bg} rounded-lg p-3`}>
            <p className="text-[11px] text-muted-foreground">{t.label}</p>
            <p className="text-base font-bold text-foreground">{t.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface OwnerFormFieldsProps {
  form: FormState;
  onChange: (key: keyof FormState, value: string) => void;
  showPassword: boolean;
}

function OwnerFormFields({
  form,
  onChange,
  showPassword,
}: OwnerFormFieldsProps) {
  const fields: {
    key: keyof FormState;
    label: string;
    placeholder: string;
    type?: string;
  }[] = [
    { key: "blockNo", label: "Block No.", placeholder: "A" },
    { key: "flatNo", label: "Flat No.", placeholder: "101" },
    { key: "ownerName", label: "Owner Name", placeholder: "Rahul Sharma" },
    { key: "phone", label: "Phone", placeholder: "9876543210" },
    { key: "maintenanceAmount", label: "Maintenance (₹)", placeholder: "2500" },
    { key: "username", label: "Username", placeholder: "rahul_a101" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map(({ key, label, placeholder, type }) => (
        <div key={key}>
          <Label className="text-xs">{label}</Label>
          <Input
            data-ocid={`resident.${key}.input`}
            value={form[key]}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={placeholder}
            type={type}
            className="mt-1 h-9 text-sm"
          />
        </div>
      ))}
      {showPassword && (
        <div>
          <Label className="text-xs">Password</Label>
          <Input
            data-ocid="resident.password.input"
            type="password"
            value={form.password}
            onChange={(e) => onChange("password", e.target.value)}
            placeholder="••••••••"
            className="mt-1 h-9 text-sm"
          />
        </div>
      )}
    </div>
  );
}

export default function ResidentsPage() {
  const { actor, isFetching } = useAdminActor();
  const [owners, setOwners] = useState<FlatOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedOwner, setSelectedOwner] = useState<FlatOwner | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [linkPrincipal, setLinkPrincipal] = useState("");
  const [saving, setSaving] = useState(false);

  const handleFormChange = useCallback(
    (key: keyof FormState, value: string) => {
      setForm((p) => ({ ...p, [key]: value }));
    },
    [],
  );

  const loadOwners = useCallback(async () => {
    if (!actor || isFetching) return;
    setLoading(true);
    try {
      const list = await actor.getAllFlatOwners();
      setOwners(list);
    } catch {
      toast.error("Failed to load residents");
    } finally {
      setLoading(false);
    }
  }, [actor, isFetching]);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setSelectedOwner(null);
    setModal("add");
  };
  const openEdit = (o: FlatOwner) => {
    setSelectedOwner(o);
    setForm({
      blockNo: o.blockNo,
      flatNo: o.flatNo,
      ownerName: o.ownerName,
      phone: o.phone,
      maintenanceAmount: o.maintenanceAmount.toString(),
      username: o.username,
      password: "",
    });
    setModal("edit");
  };
  const openDelete = (o: FlatOwner) => {
    setSelectedOwner(o);
    setModal("delete");
  };
  const openLink = (o: FlatOwner) => {
    setSelectedOwner(o);
    setLinkPrincipal("");
    setModal("link");
  };

  const handleAdd = async () => {
    if (!actor) return;
    setSaving(true);
    try {
      await actor.createFlatOwner(
        form.blockNo,
        form.flatNo,
        form.ownerName,
        form.phone,
        BigInt(form.maintenanceAmount || "0"),
        form.username,
        form.password,
      );
      toast.success("Resident added successfully");
      setModal(null);
      loadOwners();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add resident");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!actor || !selectedOwner) return;
    setSaving(true);
    try {
      await actor.updateFlatOwner(
        selectedOwner.id,
        form.blockNo,
        form.flatNo,
        form.ownerName,
        form.phone,
        BigInt(form.maintenanceAmount || "0"),
      );
      toast.success("Resident updated");
      setModal(null);
      loadOwners();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update resident");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!actor || !selectedOwner) return;
    setSaving(true);
    try {
      await actor.deleteFlatOwner(selectedOwner.id);
      toast.success("Resident deleted");
      setModal(null);
      loadOwners();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const handleLink = async () => {
    if (!actor || !selectedOwner) return;
    setSaving(true);
    try {
      const principal = Principal.fromText(linkPrincipal.trim());
      await (actor as any).linkOwnerToPrincipal(selectedOwner.id, principal);
      toast.success("Principal linked successfully");
      setModal(null);
    } catch (e: any) {
      toast.error(e?.message || "Invalid principal or failed to link");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-end">
        <Button
          type="button"
          data-ocid="residents.add.button"
          onClick={openAdd}
          className="bg-primary hover:bg-primary/90 text-white h-9 text-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Resident
        </Button>
      </div>

      {/* Society Overview mini */}
      <SocietyOverviewMini />

      {/* Owners Table */}
      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Flat Owners List
          </h2>
        </div>
        {loading ? (
          <div data-ocid="residents.loading_state" className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </div>
        ) : owners.length === 0 ? (
          <div
            data-ocid="residents.empty_state"
            className="p-10 text-center text-muted-foreground text-sm"
          >
            No residents found. Add your first flat owner.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[oklch(0.96_0.005_245)] hover:bg-[oklch(0.96_0.005_245)]">
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    #
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Unit
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Owner Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Phone
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Username
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Monthly Maintenance
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((owner, idx) => (
                  <TableRow
                    key={owner.id.toString()}
                    data-ocid={`residents.item.${idx + 1}`}
                    className="text-sm"
                  >
                    <TableCell className="text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {owner.blockNo}-{owner.flatNo}
                    </TableCell>
                    <TableCell>{owner.ownerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {owner.phone}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {owner.username}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatINR(owner.maintenanceAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          data-ocid={`residents.edit_button.${idx + 1}`}
                          onClick={() => openEdit(owner)}
                          className="w-7 h-7 rounded flex items-center justify-center hover:bg-accent transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          type="button"
                          data-ocid={`residents.link.${idx + 1}`}
                          onClick={() => openLink(owner)}
                          className="w-7 h-7 rounded flex items-center justify-center hover:bg-accent transition-colors"
                          title="Link Principal"
                        >
                          <Link className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          type="button"
                          data-ocid={`residents.delete_button.${idx + 1}`}
                          onClick={() => openDelete(owner)}
                          className="w-7 h-7 rounded flex items-center justify-center hover:bg-destructive/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Dialog open={modal === "add"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent data-ocid="residents.add.dialog" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Resident</DialogTitle>
          </DialogHeader>
          <OwnerFormFields
            form={form}
            onChange={handleFormChange}
            showPassword={true}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModal(null)}
              data-ocid="residents.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="bg-primary text-white"
              data-ocid="residents.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Add Resident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog
        open={modal === "edit"}
        onOpenChange={(o) => !o && setModal(null)}
      >
        <DialogContent data-ocid="residents.edit.dialog" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Resident</DialogTitle>
          </DialogHeader>
          <OwnerFormFields
            form={form}
            onChange={handleFormChange}
            showPassword={false}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModal(null)}
              data-ocid="residents.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving}
              className="bg-primary text-white"
              data-ocid="residents.edit.save_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog
        open={modal === "delete"}
        onOpenChange={(o) => !o && setModal(null)}
      >
        <DialogContent data-ocid="residents.delete.dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Resident</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong>{selectedOwner?.ownerName}</strong> (
            {selectedOwner?.blockNo}-{selectedOwner?.flatNo})? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModal(null)}
              data-ocid="residents.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
              data-ocid="residents.delete.confirm_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Principal Modal */}
      <Dialog
        open={modal === "link"}
        onOpenChange={(o) => !o && setModal(null)}
      >
        <DialogContent data-ocid="link.dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Link Owner to Principal</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              Link <strong>{selectedOwner?.ownerName}</strong> to their Internet
              Identity principal so they can login.
            </p>
            <Label className="text-xs">Principal ID</Label>
            <Input
              data-ocid="link.principal.input"
              value={linkPrincipal}
              onChange={(e) => setLinkPrincipal(e.target.value)}
              placeholder="aaaaa-bbbbb-ccccc-ddddd-eee"
              className="mt-1 h-9 text-sm font-mono"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModal(null)}
              data-ocid="link.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLink}
              disabled={saving}
              className="bg-primary text-white"
              data-ocid="link.confirm_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Link Principal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
