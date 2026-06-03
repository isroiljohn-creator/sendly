import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("railway.internal")
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

class QueryBuilder {
  private tableName: string;
  private selectStr = "*";
  private selectOpts: any = {};
  private method: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: any = null;
  private wheres: Array<{ sql: string; values: any[] }> = [];
  private orderClauses: string[] = [];
  private limitVal?: number;
  private offsetVal?: number;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields = "*", options?: any) {
    this.selectStr = fields;
    if (options) this.selectOpts = options;
    return this;
  }

  insert(data: any) {
    this.method = "insert";
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.method = "update";
    this.payload = data;
    return this;
  }

  delete() {
    this.method = "delete";
    return this;
  }

  upsert(data: any, options?: any) {
    this.method = "upsert";
    this.payload = data;
    return this;
  }

  eq(column: string, value: any) {
    this.wheres.push({ sql: `${column} = $PARAM`, values: [value] });
    return this;
  }

  neq(column: string, value: any) {
    this.wheres.push({ sql: `${column} != $PARAM`, values: [value] });
    return this;
  }

  in(column: string, values: any[]) {
    this.wheres.push({ sql: `${column} = ANY($PARAM)`, values: [values] });
    return this;
  }

  gt(column: string, value: any) {
    this.wheres.push({ sql: `${column} > $PARAM`, values: [value] });
    return this;
  }

  lte(column: string, value: any) {
    this.wheres.push({ sql: `${column} <= $PARAM`, values: [value] });
    return this;
  }

  gte(column: string, value: any) {
    this.wheres.push({ sql: `${column} >= $PARAM`, values: [value] });
    return this;
  }

  or(orStr: string) {
    const parts = orStr.split(',');
    const subSqls: string[] = [];
    const vals: any[] = [];
    for (const part of parts) {
      if (part.endsWith('.is.null')) {
        const col = part.substring(0, part.length - '.is.null'.length);
        subSqls.push(`${col} IS NULL`);
      } else if (part.includes('.lt.')) {
        const idx = part.indexOf('.lt.');
        const col = part.substring(0, idx);
        const val = part.substring(idx + 4);
        subSqls.push(`${col} < $PARAM`);
        vals.push(val);
      } else if (part.includes('.eq.')) {
        const idx = part.indexOf('.eq.');
        const col = part.substring(0, idx);
        const val = part.substring(idx + 4);
        subSqls.push(`${col} = $PARAM`);
        vals.push(val);
      }
    }
    this.wheres.push({ sql: `(${subSqls.join(' OR ')})`, values: vals });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const dir = options?.ascending === false ? "DESC" : "ASC";
    this.orderClauses.push(`${column} ${dir}`);
    return this;
  }

  limit(count: number) {
    this.limitVal = count;
    return this;
  }

  range(from: number, to: number) {
    this.limitVal = to - from + 1;
    this.offsetVal = from;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  // Promise-like then to support await
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    try {
      const result = await this.execute();
      if (onfulfilled) return onfulfilled(result);
      return result;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  private async execute(): Promise<{ data: any; error: any; count?: number }> {
    const p = getPool();
    let sql = "";
    const values: any[] = [];
    let paramIndex = 1;

    const nextParam = () => `$${paramIndex++}`;

    const isJoin = this.selectStr.includes("contacts!inner");

    const getWhereSql = () => {
      if (this.wheres.length === 0) return "";
      const sqlParts: string[] = [];
      for (const w of this.wheres) {
        let partSql = w.sql;
        for (const val of w.values) {
          partSql = partSql.replace('$PARAM', nextParam());
          values.push(val);
        }
        sqlParts.push(partSql);
      }
      let joinedSql = sqlParts.join(" AND ");
      if (isJoin) {
        joinedSql = joinedSql
          .replace(/contacts\./g, "c.")
          .replace(/messages\./g, "m.")
          .replace(/automation_runs\./g, "r.")
          .replace(/conversions\./g, "conv.")
          .replace(/gamification_scores\./g, "g.");
      }
      return `WHERE ${joinedSql}`;
    };

    try {
      if (this.method === "select") {
        if (isJoin) {
          let selectFields = "";
          let joinClause = "";
          if (this.tableName === "gamification_scores") {
            selectFields = "g.points, g.updated_at, c.id as c_id, c.instagram_user_id as c_instagram_user_id, c.username as c_username, c.full_name as c_full_name, c.profile_picture as c_profile_picture, c.user_id as c_user_id";
            joinClause = "FROM gamification_scores g JOIN contacts c ON g.contact_id = c.id";
          } else if (this.tableName === "messages") {
            selectFields = "m.id, c.user_id as c_user_id";
            joinClause = "FROM messages m JOIN contacts c ON m.contact_id = c.id";
          } else if (this.tableName === "automation_runs") {
            selectFields = "r.id, c.user_id as c_user_id";
            joinClause = "FROM automation_runs r JOIN contacts c ON r.contact_id = c.id";
          } else if (this.tableName === "conversions") {
            selectFields = "conv.id, conv.converted_at, conv.automation_id, conv.contact_id, c.user_id as c_user_id";
            joinClause = "FROM conversions conv JOIN contacts c ON conv.contact_id = c.id";
          }

          const whereSql = getWhereSql();
          const orderSql = this.orderClauses.length > 0 
            ? `ORDER BY ${this.orderClauses.join(", ").replace(/conversions\./g, "conv.").replace(/contacts\./g, "c.")}`
            : "";
          const limitSql = this.limitVal !== undefined ? `LIMIT ${this.limitVal}` : "";
          const offsetSql = this.offsetVal !== undefined ? `OFFSET ${this.offsetVal}` : "";

          sql = `SELECT ${selectFields} ${joinClause} ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`;
        } else {
          const selectFields = this.selectStr === "*" ? "*" : this.selectStr;
          const whereSql = getWhereSql();
          const orderSql = this.orderClauses.length > 0 ? `ORDER BY ${this.orderClauses.join(", ")}` : "";
          const limitSql = this.limitVal !== undefined ? `LIMIT ${this.limitVal}` : "";
          const offsetSql = this.offsetVal !== undefined ? `OFFSET ${this.offsetVal}` : "";

          sql = `SELECT ${selectFields} FROM ${this.tableName} ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`;
        }
      } else if (this.method === "insert") {
        const payloadObj = this.payload;
        if (Array.isArray(payloadObj)) {
          if (payloadObj.length === 0) {
            return { data: [], error: null };
          }
          const keys = Object.keys(payloadObj[0]);
          const cols = keys.map(k => `"${k}"`).join(", ");
          const rowsSql: string[] = [];
          for (const row of payloadObj) {
            const placeholders = keys.map(k => {
              values.push(row[k]);
              return nextParam();
            });
            rowsSql.push(`(${placeholders.join(", ")})`);
          }
          sql = `INSERT INTO ${this.tableName} (${cols}) VALUES ${rowsSql.join(", ")} RETURNING *`;
        } else {
          const keys = Object.keys(payloadObj);
          const cols = keys.map(k => `"${k}"`).join(", ");
          const placeholders = keys.map(k => {
            values.push(payloadObj[k]);
            return nextParam();
          });
          sql = `INSERT INTO ${this.tableName} (${cols}) VALUES (${placeholders.join(", ")}) RETURNING *`;
        }
      } else if (this.method === "update") {
        const payloadObj = this.payload;
        const setClauses: string[] = [];
        for (const key of Object.keys(payloadObj)) {
          values.push(payloadObj[key]);
          setClauses.push(`"${key}" = ${nextParam()}`);
        }
        const whereSql = getWhereSql();
        sql = `UPDATE ${this.tableName} SET ${setClauses.join(", ")} ${whereSql} RETURNING *`;
      } else if (this.method === "delete") {
        const whereSql = getWhereSql();
        sql = `DELETE FROM ${this.tableName} ${whereSql} RETURNING *`;
      } else if (this.method === "upsert") {
        const payloadObj = this.payload;
        const isArray = Array.isArray(payloadObj);
        const rows = isArray ? payloadObj : [payloadObj];
        if (rows.length === 0) {
          return { data: [], error: null };
        }
        const keys = Object.keys(rows[0]);
        const cols = keys.map(k => `"${k}"`).join(", ");
        const rowsSql: string[] = [];
        for (const row of rows) {
          const placeholders = keys.map(k => {
            values.push(row[k]);
            return nextParam();
          });
          rowsSql.push(`(${placeholders.join(", ")})`);
        }
        
        let conflictTarget = "";
        let doUpdateSet = "";
        if (this.tableName === "gamification_scores") {
          conflictTarget = "(contact_id, account_id)";
          const updateKeys = keys.filter(k => k !== "contact_id" && k !== "account_id");
          doUpdateSet = updateKeys.map(k => `"${k}" = EXCLUDED."${k}"`).join(", ");
        } else {
          conflictTarget = "(id)";
          const updateKeys = keys.filter(k => k !== "id");
          doUpdateSet = updateKeys.map(k => `"${k}" = EXCLUDED."${k}"`).join(", ");
        }
        
        sql = `INSERT INTO ${this.tableName} (${cols}) VALUES ${rowsSql.join(", ")} 
               ON CONFLICT ${conflictTarget} 
               DO UPDATE SET ${doUpdateSet} 
               RETURNING *`;
      }

      // Check if we need count for head option
      let totalCount: number | undefined;
      if (this.method === "select" && this.selectOpts.count) {
        const countWhereSql = getWhereSql();
        let countSql = "";
        if (isJoin) {
          let joinClause = "";
          if (this.tableName === "gamification_scores") {
            joinClause = "FROM gamification_scores g JOIN contacts c ON g.contact_id = c.id";
          } else if (this.tableName === "messages") {
            joinClause = "FROM messages m JOIN contacts c ON m.contact_id = c.id";
          } else if (this.tableName === "automation_runs") {
            joinClause = "FROM automation_runs r JOIN contacts c ON r.contact_id = c.id";
          } else if (this.tableName === "conversions") {
            joinClause = "FROM conversions conv JOIN contacts c ON conv.contact_id = c.id";
          }
          countSql = `SELECT COUNT(*) as count ${joinClause} ${countWhereSql}`;
        } else {
          countSql = `SELECT COUNT(*) as count FROM ${this.tableName} ${countWhereSql}`;
        }
        const { rows: countRows } = await p.query(countSql, values);
        totalCount = parseInt(countRows[0].count, 10);
        
        if (this.selectOpts.head) {
          return { data: [], error: null, count: totalCount };
        }
      }

      const { rows } = await p.query(sql, values);

      let resultData: any = rows;
      if (isJoin) {
        resultData = rows.map(row => {
          if (this.tableName === "gamification_scores") {
            return {
              points: row.points,
              updated_at: row.updated_at,
              contacts: {
                id: row.c_id,
                instagram_user_id: row.c_instagram_user_id,
                username: row.c_username,
                full_name: row.c_full_name,
                profile_picture: row.c_profile_picture,
                user_id: row.c_user_id
              }
            };
          } else if (this.tableName === "messages") {
            return {
              id: row.id,
              contacts: {
                user_id: row.c_user_id
              }
            };
          } else if (this.tableName === "automation_runs") {
            return {
              id: row.id,
              contacts: {
                user_id: row.c_user_id
              }
            };
          } else if (this.tableName === "conversions") {
            return {
              id: row.id,
              converted_at: row.converted_at,
              automation_id: row.automation_id,
              contact_id: row.contact_id,
              contacts: {
                user_id: row.c_user_id
              }
            };
          }
          return row;
        });
      }

      if (this.isSingle || this.isMaybeSingle) {
        resultData = resultData.length > 0 ? resultData[0] : null;
      }

      return { data: resultData, error: null, count: totalCount };
    } catch (err: any) {
      console.error("[PGDB Query Error] Query SQL:", sql, "Values:", values, "Error:", err);
      return { data: null, error: err };
    }
  }
}

export const supabase = {
  from(tableName: string) {
    return new QueryBuilder(tableName);
  }
};
