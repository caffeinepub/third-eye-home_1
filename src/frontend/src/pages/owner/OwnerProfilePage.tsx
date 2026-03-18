import { Calendar, Hash, Home, IndianRupee, Phone, User } from "lucide-react";
import type { FlatOwnerPublic } from "../../backend.d";
import { formatDate, formatINR } from "../../utils/format";

interface Props {
  profile: FlatOwnerPublic | null;
}

const ProfileField = ({
  icon,
  label,
  value,
}: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border">
    <div className="w-9 h-9 rounded-lg bg-[oklch(0.94_0.04_252)] flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  </div>
);

export default function OwnerProfilePage({ profile }: Props) {
  if (!profile) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-card p-10 text-center text-sm text-muted-foreground">
        Profile not available.
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {profile.ownerName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {profile.ownerName}
            </h2>
            <p className="text-sm text-muted-foreground">
              Unit {profile.blockNo}-{profile.flatNo}
            </p>
            <span className="text-xs bg-[oklch(0.94_0.04_252)] text-primary px-2 py-0.5 rounded font-medium">
              Flat Owner
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <ProfileField
            icon={<Home className="w-4 h-4 text-primary" />}
            label="Block Number"
            value={profile.blockNo}
          />
          <ProfileField
            icon={<Hash className="w-4 h-4 text-primary" />}
            label="Flat Number"
            value={profile.flatNo}
          />
          <ProfileField
            icon={<User className="w-4 h-4 text-primary" />}
            label="Owner Name"
            value={profile.ownerName}
          />
          <ProfileField
            icon={<Phone className="w-4 h-4 text-primary" />}
            label="Phone Number"
            value={profile.phone}
          />
          <ProfileField
            icon={<IndianRupee className="w-4 h-4 text-primary" />}
            label="Monthly Maintenance"
            value={formatINR(profile.maintenanceAmount)}
          />
          <ProfileField
            icon={<Calendar className="w-4 h-4 text-primary" />}
            label="Member Since"
            value={formatDate(profile.createdAt)}
          />
        </div>
      </div>

      <div className="bg-[oklch(0.94_0.04_252)] rounded-xl p-4 border border-[oklch(0.88_0.06_252)]">
        <p className="text-xs text-foreground/70">
          <strong>Note:</strong> This profile is read-only. Contact your society
          admin to update any information.
        </p>
      </div>
    </div>
  );
}
