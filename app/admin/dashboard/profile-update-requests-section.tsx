import { getProfileDisplayName } from "@/lib/profiles/display-name";
import { ProfileUpdateRequestActions } from "./profile-update-request-actions";

export type ProfileUpdateRequestView = {
  id: string;
  request_type: "student_grade_change" | "tutor_grades_change";
  created_at: string;
  profiles: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    role: "student" | "tutor" | "admin";
  } | null;
  current_value: {
    label: string;
  };
  requested_value: {
    label: string;
  };
};

function getRequestLabel(requestType: ProfileUpdateRequestView["request_type"]) {
  if (requestType === "student_grade_change") {
    return "Cambio de grado del estudiante";
  }

  return "Cambio de grados que enseña el tutor";
}

function getRequestDescription(
  requestType: ProfileUpdateRequestView["request_type"]
) {
  if (requestType === "student_grade_change") {
    return "El estudiante solicita actualizar su grado académico.";
  }

  return "El tutor solicita actualizar los grados que puede enseñar.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ProfileUpdateRequestsSection({
  requests,
}: {
  requests: ProfileUpdateRequestView[];
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-[#E2DFD7] bg-white shadow-[0_8px_24px_rgba(46,111,135,.10)]">
      <div className="flex flex-col gap-3 border-b border-[#E2DFD7] bg-[#FBFAF7] p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Revisión administrativa
          </p>

          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
            Solicitudes de actualización
          </h2>

          <p className="mt-2 text-sm text-[#5A6B73]">
            Cambios académicos solicitados por estudiantes o tutores.
          </p>
        </div>

        <span className="w-fit rounded-full bg-[#E0EFEF] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#1C2E36]">
          {requests.length} pendiente{requests.length === 1 ? "" : "s"}
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="p-6">
          <div className="rounded-xl border border-dashed border-[#CFC8BB] bg-[#F7F5F0] p-5 text-sm font-semibold text-[#5A6B73]">
            No hay solicitudes de actualización pendientes.
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#E2DFD7]">
          {requests.map((request) => {
            const profile = request.profiles;
            const displayName = getProfileDisplayName(profile, "Usuario");

            return (
              <div
                key={request.id}
                className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-extrabold tracking-[-0.02em] text-[#1C2E36]">
                      {displayName}
                    </h3>

                    <span className="rounded-full bg-[#F7F5F0] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5A6B73]">
                      {profile?.role ?? "usuario"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-[#5A6B73]">
                    {profile?.email ?? "Correo no disponible"}
                  </p>

                  <div className="mt-4 rounded-xl border border-[#E2DFD7] bg-[#F7F5F0] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#5BA8AC]">
                          {getRequestLabel(request.request_type)}
                        </p>

                        <p className="mt-1 text-sm text-[#5A6B73]">
                          {getRequestDescription(request.request_type)}
                        </p>
                      </div>

                      <p className="text-xs font-semibold text-[#5A6B73]">
                        {formatDate(request.created_at)}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#5A6B73]">
                          Actual
                        </p>

                        <p className="mt-1 text-sm font-extrabold text-[#1C2E36]">
                          {request.current_value.label}
                        </p>
                      </div>

                      <div className="rounded-lg border border-[#B9DAD9] bg-[#E0EFEF] p-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#2E6F87]">
                          Solicitado
                        </p>

                        <p className="mt-1 text-sm font-extrabold text-[#1C2E36]">
                          {request.requested_value.label}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:min-w-[150px]">
                  <ProfileUpdateRequestActions requestId={request.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
