import { collections } from "@/lib/mongo";
import { addHoliday, removeHoliday } from "@/actions/admin";
import { ErrorBanner } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Holidays" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminHolidaysPage({ searchParams }: Props) {
  const query = await searchParams;
  const error = typeof query?.error === "string" ? query.error : null;
  const holidays = await collections().holidays.find({}).sort({ _id: 1 }).toArray();

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl">BD holiday calendar</h1>
      <ErrorBanner message={error} />

      <Card className="mt-4">
        <CardContent>
          <form action={addHoliday} className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label id="holiday-date-label">Date</Label>
              <DatePickerField name="date" labelledBy="holiday-date-label" isRequired />
            </div>
            <div className="grid min-w-[200px] flex-1 gap-1.5">
              <Label htmlFor="holiday-name">Name</Label>
              <Input
                id="holiday-name"
                name="name"
                required
                placeholder="e.g. Independence Day"
                aria-label="Holiday name"
              />
            </div>
            <Button type="submit">Add holiday</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((h) => (
                <TableRow key={String(h._id)}>
                  <TableCell className="font-medium">{String(h._id)}</TableCell>
                  <TableCell>{h.name}</TableCell>
                  <TableCell className="text-right">
                    <form action={removeHoliday} className="inline">
                      <input type="hidden" name="date" value={String(h._id)} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                        Remove
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {holidays.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    No holidays yet — load the 2026–27 BD govt calendar at setup.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}