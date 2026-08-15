"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

export interface MergeSettingsValues {
  outputName: string;
  optimize: boolean;
  linearize: boolean;
  bookmarks: boolean;
  metadata: boolean;
  compression: string;
  pdfVersion: string;
}

interface Props {
  value: MergeSettingsValues;
  onChange(value: MergeSettingsValues): void;
}

export default function MergeSettings({
  value,
  onChange,
}: Props) {

  const update = <
    K extends keyof MergeSettingsValues
  >(
    key: K,
    val: MergeSettingsValues[K]
  ) => {

    onChange({
      ...value,
      [key]: val,
    });

  };

  return (

    <Card>

      <CardHeader>

        <CardTitle>

          Merge Settings

        </CardTitle>

      </CardHeader>

      <CardContent className="space-y-6">

        <div>

          <label className="mb-2 block text-sm font-medium">

            Output File Name

          </label>

          <Input
            value={value.outputName}
            placeholder="merged.pdf"
            onChange={(e) =>
              update(
                "outputName",
                e.target.value
              )
            }
          />

        </div>

        <div>

          <label className="mb-2 block text-sm font-medium">

            Compression

          </label>

          <Select
            value={value.compression}
            onChange={(v) =>
              update(
                "compression",
                v
              )
            }
            options={[
              {
                label: "None",
                value: "none",
              },
              {
                label: "Low",
                value: "low",
              },
              {
                label: "Medium",
                value: "medium",
              },
              {
                label: "High",
                value: "high",
              },
            ]}
          />

        </div>

        <div>

          <label className="mb-2 block text-sm font-medium">

            PDF Version

          </label>

          <Select
            value={value.pdfVersion}
            onChange={(v) =>
              update(
                "pdfVersion",
                v
              )
            }
            options={[
              {
                label: "Auto",
                value: "auto",
              },
              {
                label: "1.4",
                value: "1.4",
              },
              {
                label: "1.5",
                value: "1.5",
              },
              {
                label: "1.6",
                value: "1.6",
              },
              {
                label: "1.7",
                value: "1.7",
              },
              {
                label: "2.0",
                value: "2.0",
              },
            ]}
          />

        </div>

        <div className="space-y-3">

          <SettingSwitch
            title="Optimize PDF"
            checked={value.optimize}
            onChange={(v) =>
              update(
                "optimize",
                v
              )
            }
          />

          <SettingSwitch
            title="Fast Web View"
            checked={value.linearize}
            onChange={(v) =>
              update(
                "linearize",
                v
              )
            }
          />

          <SettingSwitch
            title="Keep Bookmarks"
            checked={value.bookmarks}
            onChange={(v) =>
              update(
                "bookmarks",
                v
              )
            }
          />

          <SettingSwitch
            title="Keep Metadata"
            checked={value.metadata}
            onChange={(v) =>
              update(
                "metadata",
                v
              )
            }
          />

        </div>

        <Badge variant="success">

          Production Ready

        </Badge>

      </CardContent>

    </Card>

  );

}

function SettingSwitch({

  title,

  checked,

  onChange,

}:{

  title:string;

  checked:boolean;

  onChange(v:boolean):void;

}){

  return(

    <label className="flex items-center justify-between rounded-xl border p-3">

      <span className="font-medium">

        {title}

      </span>

      <input

        type="checkbox"

        checked={checked}

        onChange={(e)=>

          onChange(
            e.target.checked
          )

        }

        className="h-5 w-5"

      />

    </label>

  )

}